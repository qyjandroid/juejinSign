const env = process.env || {};

module.exports = {
    user: {
        password: env.USER_PASSWORD, // 你的掘金登录密码
        email: env.USER_EMAIL, // 你的接收通知的邮箱
    },
}