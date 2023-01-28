const calculateDistance20130103 = async (page) => {
    const distance = await page.evaluate(() => {

        const oriBtnWrapper = document.getElementById('oriBtnWrapper');
        const oriBgWrapper = document.getElementById('oriBgWrapper');

        function drawLines(parent, info) {
            const lineLeft = document.createElement('div');
            const lineRight = document.createElement('div');
            const lineTop = document.createElement('div');
            const lineBottom = document.createElement('div');

            lineLeft.classList.add('base-line', 'h100');
            lineRight.classList.add('base-line', 'h100');
            lineTop.classList.add('base-line', 'w100');
            lineBottom.classList.add('base-line', 'w100');

            lineLeft.style.cssText = `left:${info.left}px`;
            lineRight.style.cssText = `left:${info.right}px;`;
            lineTop.style.cssText = `top:${info.top}px;height:1px`;
            lineBottom.style.cssText = `top:${info.bottom}px;height:1px`;

            if (parent) {
                parent.appendChild(lineLeft);
                parent.appendChild(lineRight);
                parent.appendChild(lineTop);
                parent.appendChild(lineBottom);
            }

        }

        function getElementInfo(el) {
            const bd = el.getBoundingClientRect();
            const parent = el.parentElement;
            const sdb = parent.getBoundingClientRect();

            const data = {
                height: bd.height,
                width: bd.width,
                top: bd.top - sdb.top,
                left: bd.left - sdb.left
            }
            console.log('getElementInfo:', data);
            return data
        }

        const allowDeviation = (num1, num2, offset = 25) => {
            return -offset <= num1 - num2 && num1 - num2 <= offset
        }

        function compareWhiteBorder(context, x, y) {
            const imgData = context.getImageData(1 * x, 1 * y, 1, 1).data;
            const r = imgData[0];
            const g = imgData[1];
            const b = imgData[2];
            if (allowDeviation(r, 230) && allowDeviation(g, 230) && allowDeviation(b, 230)) {
                return true;
            }
            return false;
        }

        function getContext(img, append = false, parent = document.body) {
            const { naturalWidth, naturalHeight } = img;

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            canvas.height = naturalHeight;
            canvas.width = naturalWidth;
            if (append && parent) {
                parent.appendChild(canvas);
            }
            context.drawImage(img, 0, 0, naturalWidth, naturalHeight);

            return context;
        }

        // 计算滑动按钮的基线
        function getBaseLineAxises(sBtn) {
            const { naturalWidth, naturalHeight } = sBtn;
            const ctx = getContext(sBtn, undefined, oriBtnWrapper);

            const nWidth = Math.floor(naturalWidth * 0.3);
            const nHeight = Math.floor(naturalHeight * 0.3);
            console.log("遍历的宽高:", nWidth, nHeight);
            // bottom
            let bottomYAxis = [];
            let topYAxis = [];
            let leftXAxis = [];
            let rightXAxis = [];
            for (let y = naturalHeight - nHeight; y < naturalHeight; y++) {
                let times = 0;
                for (let x = 0; x < naturalWidth; x++) {
                    if (compareWhiteBorder(ctx, x, y,)) {
                        times++
                    }
                }
                if (times > 25) {
                    bottomYAxis.push({
                        value: y,
                        times
                    });
                }
            }
            // left
            for (let x = 0; x < nWidth; x++) {
                let times = 0;
                for (let y = 0; y < naturalHeight; y++) {
                    if (compareWhiteBorder(ctx, x, y,)) {
                        times++
                    }
                }
                if (times > 25) {
                    leftXAxis.push({
                        value: x,
                        times
                    });
                }
            }
            // 如果相同，取左边
            leftXAxis.sort((a, b) => a.times >= b.times /*&& a.value < b.value */ ? -1 : 1);
            // top
            for (let y = 0; y < nHeight; y++) {
                let times = 0;
                for (let x = 0; x < naturalWidth; x++) {
                    if (compareWhiteBorder(ctx, x, y,)) {
                        times++
                    }
                }
                if (times > 25) {
                    topYAxis.push({
                        value: y,
                        times
                    });
                }
            }
            // right
            for (let x = naturalWidth - nWidth; x < naturalWidth; x++) {
                let times = 0;
                for (let y = 0; y < naturalHeight; y++) {
                    if (compareWhiteBorder(ctx, x, y,)) {
                        times++
                    }
                }
                if (times > 25) {
                    rightXAxis.push({
                        value: x,
                        times
                    });
                }
            }
            const baseData = {
                left: leftXAxis,
                bottom: bottomYAxis,
                top: topYAxis,
                right: rightXAxis,
            };
            return baseData;
        }

        /*
        *  mode = 1 仅仅比较数值
        *  mode = 2 仅仅比较次数
        *  mode = 3 次数 + 数值
        */
        function guessBaseLineAxises(baseLineAxis, mode = 1) {
            const res = Object.create(null);
            switch (mode) {
                case 1:
                    res.top = baseLineAxis.top.sort((a, b) => a.value < b.value ? -1 : 1);
                    res.bottom = baseLineAxis.bottom.sort((a, b) => a.value > b.value ? -1 : 1);
                    res.left = baseLineAxis.left.sort((a, b) => a.value < b.value ? -1 : 1);
                    res.right = baseLineAxis.right.sort((a, b) => a.value > b.value ? -1 : 1);
                    break;
                case 2:
                    for (p in baseLineAxis) {
                        res[p] = baseLineAxis[p].sort((a, b) => a.times >= b.times ? -1 : 1);
                    }
                    break;
                case 3:
                    res.top = baseLineAxis.top.sort((a, b) => a.times >= b.times && a.value < b.value ? -1 : 1);
                    res.bottom = baseLineAxis.bottom.sort((a, b) => a.times >= b.times && a.value > b.value ? -1 : 1);
                    res.left = baseLineAxis.left.sort((a, b) => a.times >= b.times && a.value < b.value ? -1 : 1);
                    res.right = baseLineAxis.right.sort((a, b) => a.times >= b.times && a.value > b.value ? -1 : 1);
                    break;

                default:
                    return baseLineAxis;
            }
            res.right = baseLineAxis.right.sort((a, b) => a.value > b.value ? -1 : 1);

            return res;
        }

        function computeDistance(ctxBg, bgImg, sBtn, sBtnLineAxises) {
            const { naturalWidth, naturalHeight } = sBtn;

            const eInfo = getElementInfo(sBtn);
            console.log('eInfo:', eInfo);

            const sizeRate = (naturalHeight / eInfo.height);
            const bottom = Math.floor((eInfo.top + eInfo.height) * sizeRate) - (naturalHeight - sBtnLineAxises.bottom);
            console.log("sizeRate:", sizeRate, " bottom:", bottom);

            const yLower = bottom - 3;
            const yUpper = bottom + 3;

            const gapWidth = sBtnLineAxises.right - sBtnLineAxises.left;

            const maxX = bgImg.naturalWidth - sBtn.naturalWidth - 20;
            const lineGap = sBtnLineAxises.right - sBtnLineAxises.left;

            const matchArr = [];
            for (let x = 20; x <= maxX; x++) {
                // for (let x = 120; x <= maxX; x++) {
                let times = 0;
                for (let y = yLower; y <= yUpper; y++) {
                    for (let i = 0; i < 20; i++) {
                        if (
                            compareWhiteBorder(ctxBg, x, y - i)    // 左边
                            // && compareBlackBg(ctxBg, x + 6, y - i) // 左边 + 6
                            && compareWhiteBorder(ctxBg, x + lineGap, y - i)  // 右边
                            // && compareBlackBg(ctxBg, x + lineGap - 6, y - i)  //  右边 - 6
                        ) {
                            // console.log('compare:', x, y);
                            times++
                        }
                    }
                }
                if (times > 25) {
                    matchArr.push({
                        times: times,
                        value: x
                    });
                }
            }

            console.log('matchArr:', matchArr);
            if (matchArr.length > 0) {
                matchArr.sort((a, b) => a.times > b.times ? -1 : 1);
                const x = matchArr[0].value;
                const realX = Math.floor((x - sBtnLineAxises.left) / sizeRate);
                return {
                    x: realX,
                    distance: realX - eInfo.left
                };
            }

            return null;
        }

        // 图像白边界
        function getDistance(sBtn, bgImg) {

            const baseLineAxis = getBaseLineAxises(sBtn);

            const ctxBg = getContext(bgImg, undefined, oriBgWrapper);

            for (let mode = 1; mode <= 3; mode++) {
                try {
                    console.log("getDistance:mode", mode);
                    const sBtnLineAxises = guessBaseLineAxises(baseLineAxis, mode);
                    const btnLines = {
                        left: sBtnLineAxises.left[0].value,
                        right: sBtnLineAxises.right[0].value,
                        top: sBtnLineAxises.top[0].value,
                        bottom: sBtnLineAxises.bottom[0].value,
                    }
                    console.log("getDistance: lines", sBtnLineAxises, btnLines);
                    drawLines(oriBtnWrapper, btnLines);
                    const result = computeDistance(ctxBg, bgImg, sBtn, btnLines);
                    if (result == null) {
                        continue;
                    }
                    return result;
                } catch (err) {
                    console.log("computeDistance error:", err);
                    return null;
                }
            }
        }

        const sBtn = document.querySelector('.captcha_verify_img_slide');
        const bg = document.querySelector('#captcha-verify-image');
        return getDistance(sBtn, bg);

    })
    return distance;
}

module.exports = {
    calculateDistance: calculateDistance20130103
}