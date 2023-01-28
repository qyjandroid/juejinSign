
const puppeteer = require('puppeteer');
const _ = require('lodash');

const DEFAULT_CREATE_OPTIONS = {
    headless: false,
    timeout: 3000,
    slowMo: 10,
    ignoreDefaultArgs: ['--enable-automation','--disable-extensions'],
    args: ['--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-features=site-per-process',
        "--disable-web-security"
    ]
}
async function createPage(options = {}) {
    const browser = await puppeteer.launch(_.merge(DEFAULT_CREATE_OPTIONS, options));
    // 新开标签页
    const page = await browser.newPage();
    // 打开指定网址
    return {
        browser,
        page,
    }
}

module.exports = {
    createPage
}