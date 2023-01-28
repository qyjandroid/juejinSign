const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer');

const { delay } = require("../util")
const { calculateDistance } = require("./util/distanceCalc");
const { URLS } = require("./const");

const logger = console;

async function slider(page, onError) {
    try {
        // 获取canvas的左上角X坐标作为滑动的基坐标
        await page.waitForSelector('#captcha-verify-image');
        let canvasCoordinate = await page.$('#captcha-verify-image');
        let canvasBox = await canvasCoordinate.boundingBox();
        let canvasX = canvasBox.x;
        // 等待滑动按钮出现获取Y坐标
        await page.waitForSelector('.captcha_verify_img_slide');
        let button = await page.$('.captcha_verify_img_slide');
        let box = await button.boundingBox();
        let mouseY = Math.floor(box.y + box.height / 2);

        console.log("mouseY:", mouseY, ", canvasX", canvasX);
        console.log("button.x", box.x);

        // 计算位移
        let moveDistance = (await calculateDistance(page)).distance + 32;

        logger.log("mouseY:", mouseY, ", canvasX", canvasX, ",moveDistance", moveDistance);

        // 滑动验证
        logger.log('模拟滑动：开始');
        // await page.hover('.secsdk-captcha-drag-icon');
        let ticket = setTimeout(() =>{
            onError(new Error('模拟滑动：超时'));
        }, 6000);

        await page.hover('.captcha_verify_img_slide');
        await page.mouse.down();
        await page.mouse.move(Math.floor(canvasX + moveDistance / 3), mouseY, { steps: 15 });
        await page.waitForTimeout(1 * 30);
        await page.mouse.move(Math.floor(canvasX + moveDistance / 2), mouseY, { steps: 20 });
        await page.waitForTimeout(2 * 50);
        await page.mouse.move(Math.floor(canvasX + moveDistance + 10), mouseY, { steps: 18 });
        await page.waitForTimeout(3 * 80);
        await page.mouse.move(Math.floor(canvasX + moveDistance / 1), mouseY, { steps: 100 });
        await page.waitForTimeout(4 * 30);
        await page.mouse.up();
        clearTimeout(ticket);
        logger.log('模拟滑动：结束');
    } catch (err) {
        logger.error('slider error: ', err);
        onError(err);
    }
}
const MAX_RETRY_TIMES = 3;

const API_CODE_URL_PREFIX = 'https://verify.snssdk.com/captcha/verify?'

async function autoSlider(page) {

    let onClose;
    return new Promise(async (resolve, reject) => {
        try {
            let retryTimes = 0;
            let ticketRetry;
            let isVerifyPass = false;
            let isNavigating = false;
            let isClosed = false;
            onClose = async function onClose() {
                isClosed = true;
                clearTimeout(ticket);
                clearTimeout(ticketRetry);
            }
            const ticket = setTimeout(async () => {
                await onClose();
                reject(new Error('自动滑块超时'));
            }, 40 * 1000);

            await page.waitForTimeout(5000);

            const title = await page.evaluate(()=>{
                return document.title
            });

            // 等待极验出现
            await page.waitForSelector("#captcha-verify-image");
            await page.waitForSelector(".captcha_verify_img_slide");

            async function onSlideError(error) {
                if (isClosed) return;

                logger.error('onSlideError:', error);
                logger.log('onSlideError retryTimes:', retryTimes);
                if (retryTimes <= MAX_RETRY_TIMES) {
                    retryTimes++;
                    ticketRetry = setTimeout(() => slider(page, onSlideError), 1000);
                    return;
                }
                await onClose();
                reject(error);
            }

            page.on('response', async function (res) {
                try {
                    const url = res.url().toLowerCase();

                    if (isVerifyPass && url.startsWith(URLS.Login)) {
                        if (isNavigating) {
                            return logger.warn('已经跳转中...，忽略')
                        }
                        isNavigating = true;

                        logger.log('验证码验证通过，页面已跳转');
                        logger.log('延时6秒读取cookie');
                        await delay(6000);
                        if (isClosed) {
                            return;
                        }
                        const cookies = await page.cookies();
                        await onClose();
                        resolve(cookies);
                    }

                    if (!url.startsWith(API_CODE_URL_PREFIX)) {
                        return;
                    }
                    logger.log(`match ${API_CODE_URL_PREFIX}`);
                    const resData = await res.json();
                    // { code: 200, data: null, message: '验证通过' }
                    logger.log('verify result:', resData);
                    if (resData && resData.code == 200) {
                        console.log("验证码验证成功");
                        isVerifyPass = true;
                        return;
                    }
                    logger.log('滑块滑动失败，重试:', retryTimes);
                    if (retryTimes <= MAX_RETRY_TIMES) {
                        retryTimes++;
                        ticketRetry = setTimeout(() => {
                            if (isClosed) return;
                            slider(page, onSlideError)
                        }, 1000);
                        return;
                    }
                    reject(new Error('重试次数已满，失败'))
                } catch (err) {
                    logger.error('autoSlider:response', err);
                    reject(err);
                }
            });

            // 开始滑动
            slider(page, onSlideError);

        } catch (err) {
            logger.error("autoSlider error: " + err.message);
            if (typeof onClose === "function") {
                await onClose();
            }
            reject(err);
        }
        finally {
            console.log('finally:~~~~~~~~~~~~~~');
        }
    })
}


async function innerAutoSlideAndCookie(page,oldCookies,account) {
    const cookies = await autoSlider(page);
    const newCookie={...oldCookies,[account]:cookies};
    fs.writeFileSync(path.join(__dirname, "./cookies.json"), JSON.stringify(newCookie, null, "\t"));
    return cookies;
}

async function autoSlideAndCookie(page,oldCookies,account, retryTimes = 3) {
    for (let i = 0; i < retryTimes; i++) {
        try {
            logger.log("autoSlideAndCookie:retryTimes", i)
            const cookies = await innerAutoSlideAndCookie(page,oldCookies,account);
            return cookies;
        } catch (err) {
            logger.error('autoSlideAndCookie error', err);
            continue;
        }
    }
    return null;
}

module.exports = {
    autoSlider,
    autoSlideAndCookie
}


