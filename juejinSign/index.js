const fs = require('fs')
const { createPage } = require("../util/puppeteer");
const { URLS } = require("./const");
const { autoSlideAndCookie } = require("./autoSlider");
const config = require('../config/index');
const { sendEmail } = require('./util/email');

let htmlTempData=[];

async function checkIsLogin(page) {
    const loginBtn = await page.$(".login-button");
    return !loginBtn
}

function getAccount() {
    return require("./account.json")
}


async function ensureLogin(accountInfo,page,cookies) {
    // 写入cookie
    // const cookies = require("./cookies.json");
    console.log(`${accountInfo.account}准备登录`);
    const curCookies=cookies[accountInfo.account];
    if (Array.isArray(curCookies) && curCookies.length > 0) {
        //执行操作
        await page.setCookie(...curCookies)
    }
    
    await page.goto(URLS.Home);
    await page.waitForTimeout(3000);
    // 检查是否登录
    const isLogin = await checkIsLogin(page);
    console.log("isLogin: " + isLogin);

    if (!!isLogin) {
        console.log('已登录，无需登录');
        return isLogin
    }
    // 未登录，点击登录
    if (!isLogin) {
        await page.click('.login-button');
        await page.waitForTimeout(3000);
    }
    await page.waitForSelector('.auth-modal-box');
    await page.waitForTimeout(3000);

    // 其他登录方式
    await page.click(".auth-modal-box .clickable");
    await page.waitForTimeout(2000);

    // 输入账号密码
    // const account = getAccount();
    await page.type('.auth-modal-box .account-input', accountInfo.account, {
        delay: 100
    });
    //
    await page.type('.auth-modal-box [name="loginPassword"]',config.user.password , {
        delay: 100
    });
    // 点击登录
    await page.waitForTimeout(1000);
    await page.click('.auth-modal-box .panel>.btn');

    // 检查滑块
    await page.waitForTimeout(5000);

    const captchaEl = await page.$('.captcha-modal-container');
    // 没有验证码
    if (!captchaEl) {
        // 等待6秒，保存cookies
        await page.waitForTimeout(6000);
        const curUserCookie = await page.cookies();
        const newCookie={...cookies,[accountInfo.account]:curUserCookie};
        fs.writeFileSync(path.join(__dirname, "../cookies.json"), JSON.stringify(newCookie, null, "\t"));
    }
    // 自动滑块
    await autoSlideAndCookie(page,cookies,accountInfo.account);
}

async function goPlayPage(page) {
    // 点击头像
    console.log('点击头像：开始');
    await page.click('.avatar-wrapper .avatar');
    await page.waitForTimeout(2000);
    await page.waitForSelector('.user-card');
    console.log('点击头像：完毕');

    // 点击钻石
    console.log('点击钻石：开始');
    await page.waitForTimeout(2000);
    await page.click('.user-card .user-detail .ore');
    console.log('点击钻石：结束');

    // 等待跳转
    console.log('等待跳转：开始');
    // await page.waitForResponse('https://juejin.cn/user/center/signin?avatar_menu');
    await page.waitForTimeout(8000);
    console.log('等待跳转：结束');
}



// 可以直接走接口判断
async function sign(page) {
    await page.waitForSelector('.signin');
    await page.waitForTimeout(3000);

    let signBtn = await page.$('.signin .code-calender .btn');
    let classValue = await page.$eval(".signin .code-calender .btn", el => el.className);
    if (classValue.indexOf('signedin') >= 0) {
        console.log('今日已签到，无需签到')
        return "已签到"
    }
    await signBtn.click();
    await page.waitForTimeout(3000)
    classValue = await page.$eval(".signin .code-calender .btn", el => el.className);
    if (classValue.indexOf('signedin') >= 0) {
        console.log('签到成功')
        await page.waitForTimeout(3000);
        let closeBtn = await page.$('.success-modal .byte-modal__headerbtn');
        closeBtn.click();
        await page.waitForTimeout(1000);
        return "签到成功"
    }
    console.log('签到失败')
    return "签到失败"
  
}



async function autoLuckDraw(page){
    await page.waitForTimeout(1000);
    let menus=await page.$$('.menu.byte-menu a');
    menus[2].click();
    await page.waitForTimeout(6000);

    console.log("跳转到抽奖界面");

    let result={
        luckDrawResult:"",
        happyLotResult:"",
    };

    let freeLottery=await page.$('.turntable-item.lottery .text-free');
    if(freeLottery){
        let freeLotteryBtn=await page.$('#turntable-item-0');
        freeLotteryBtn.click();
        await page.waitForTimeout(5000);
        let submitBtn=await page.$('.byte-modal__body .submit');
        if(submitBtn){
            submitBtn.click();
            let luckDrawContent=await page.$eval('.lottery_modal .byte-modal__body .title',el=>el.innerHTML);
            console.log(`抽奖成功-${luckDrawContent}`);
            result.luckDrawResult=`抽奖成功-${luckDrawContent}`;
        }
    }else{
        console.log("已抽奖")
        result.luckDrawResult="已抽奖";
    }
    //沾喜气按钮
    let festivityBtn=await page.$$('svg.stick-btn');
    festivityBtn[1].click();
    await page.waitForTimeout(3000);
    let blessingBtn=await page.$('.byte-modal__body .btn.btn-submit');
    if(blessingBtn){
        blessingBtn.click();
    }
    console.log("已沾福气")
    result.happyLotResult="已沾福气";
    return result;
    
}

/**
 * 
 * 获取当前总幸运值
 * @param {any} page 
 */
async function getTotalLuckyValue(page){
    await page.waitForTimeout(1000);
    let totalLuckyValue = await page.$eval('#progress-wrap .current-value',el=>el.innerHTML);
    console.log("获取到的当前幸运值：",totalLuckyValue);
    return totalLuckyValue;
}

/**
 * 
 * 当前矿石总数
 * @param {any} page 
 * @returns 
 */
async function getTotalOre(page){
    await page.waitForTimeout(2000);
    let menus=await page.$$('.menu.byte-menu a');
    menus[0].click();
    await page.waitForTimeout(6000);
    //当前拥有的矿石数量
    let figureValue = await page.$$eval('.figures .figure',domsArr=>{return domsArr[domsArr.length-1].innerHTML});
    console.log("获取的总数：：",figureValue)
    return figureValue;
}


async function autoBugFix(page){
    await page.waitForTimeout(2000);
    let menus=await page.$$('.menu.byte-menu a');
    menus[4].click();
    await page.waitForTimeout(6000);
    let steps=await page.$$('.step');
    if(steps && steps.length>0){
        for(let i=0;i<steps.length;i++){
            const stepBtn=steps[i];
            stepBtn.click();
            await page.waitForTimeout(2000);
        }
        console.log(`完成收集bug引导`);
    }else{
        console.log(`准备收集bug`);
    }
   return await collectBug(page,0);
}

async function collectBug(page,totalBugValue){
    await page.waitForTimeout(6000);
    let bugs=await page.$$('.item.bug-item-web');
    if(bugs && bugs.length>0){
        for(let i=0;i<bugs.length;i++){
            const bugBtn=bugs[i];
            bugBtn.click();
            await page.waitForTimeout(1000);
        }
        console.log(`收取bug${bugs.length}`);
        totalBugValue+=bugs.length;
        await collectBug(page,totalBugValue);
    }else{
        console.log("暂无bug");
    }
    return totalBugValue;
}

async function autoAutoHappy() {
    const cookies = require("./cookies.json");
    //获取所有的账号
    const accounts = getAccount();
    htmlTempData=[];
    if(accounts){
        const accountArray=Object.keys(accounts);
        for(let i=0;i<accountArray.length;i++){
            const account=accountArray[i];
            const accountInfo=accounts[account];
            const statisticsResult=  await execAutoTask(accountInfo,cookies);
            htmlTempData.push(statisticsResult);
        }
    }
    autoSendEmail(htmlTempData);
}

async function autoSendEmail(statisticsData){
    let htmlStr="";
    let winningMsg="";
    for(let i=0;i<statisticsData.length;i++){
        const item=statisticsData[i];
        htmlStr+="<div>-----------------------------------------------</div>";
        htmlStr+=`
            <h1>
                用户:${item.user}
            </h1>
            <h3>签到状态:${item.signResult}</h3>
            <h3>抽奖结果:${item.luckResult}</h3>
            <h3>沾福气结果:${item.happyLotResult}</h3>
            <h3>bug收集数量:${item.bugFix}</h3>

            <h3 style="color:red">当前矿石总数:${item.totalBugValue}</h3>
            <h3 style="color:red">当前幸运值:${item.totalLuckyValue}</h3>
        `;
       if(item.luckResult.match(/(矿石|Bug)/)){
         winningMsg+=`<h1 style="color:blue">${item.user}：：${item.luckResult}</h1>`;
       }
    }
    sendEmail({
        to: config.user.email,
        html: winningMsg+htmlStr,
        subject: winningMsg?'【掘金】中奖':'【掘金】自动化结果'
    });
}


async function execAutoTask(accountInfo,cookies) {
    let browser;
    let userResult={
        user:accountInfo.account,
        signResult:"",
        luckResult:"",
        happyLotResult:"",
        bugFix:0,
        totalOre:0,
        totalLuckyValue:0
    };
    try {
        let pInfo = await createPage({
            headless: true,
            defaultViewport:{width:1400,height:1200}
        });
        let page = pInfo.page;
        browser = pInfo.browser;
        // 确保登录
        await ensureLogin(accountInfo,page,cookies);
        // 去钻石页面
        await goPlayPage(page);

        console.log("准备签到");
        const signResult=await sign(page);
        userResult.signResult=signResult;
        const luckDrawResult=await autoLuckDraw(page);
        if(luckDrawResult){
            userResult.luckResult=luckDrawResult.luckDrawResult;
            userResult.happyLotResult=luckDrawResult.happyLotResult;
        }
        //当前幸运值
        const totalLuckyValue=await getTotalLuckyValue(page);
        userResult.totalLuckyValue=totalLuckyValue;
        //收集bug
        const bugFixResult=await autoBugFix(page);
        userResult.bugFix=bugFixResult;

        //获取总矿石
        const totalOreValue=await getTotalOre(page);
        userResult.totalOre=totalOreValue;
        await page.waitForTimeout(2000);

    } catch (err) {
        console.log('ensureLogin error:', err);
    } finally {
        if (browser && browser.isConnected) {
            await browser.close();
        }
        return userResult;
    }
}


module.exports = {
    autoAutoHappy
}