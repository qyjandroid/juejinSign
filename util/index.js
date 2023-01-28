function delay(duration) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, duration);
    });
}


module.exports = {
    delay
}