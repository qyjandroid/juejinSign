const env = process.env || {};

module.exports = {
    user: {
        password: env.USER_PASSWORD, // 你的掘金登录密码
        email: env.USER_EMAIL, // 你的接收通知的邮箱
    },
    email: {
        provider: {
            auth: {
                user: process.env.EMAIL_USER, // 你的网易邮箱账号
                pass: process.env.EMAIL_PASS,  // 你的网易邮箱 smpt 授权码
            },
            host: 'smtp.163.com',
            secure: true,
            port: 465,
            secureConnection: true
        }
    }
}