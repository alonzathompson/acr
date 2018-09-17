const Plivo = require('plivo');
const plivoConfig = require('./config.js');

let AuthId = 'MAZDVMNMM5ZJM4OGUZYM';
let AuthToken = 'YTgwMDIxMDc1OTM4NzZlMjJhMGUwNWVkYjYwYzY2';

let client = new Plivo.Client(plivoConfig.plivoAuthID, plivoConfig.plivoAuthToken);

module.exports = function (msg) {
    
    console.log(msg);
    client.messages.create(
        "14849773775",
        "12028784556",
        `${msg}`,
    ).then((res) => {
        console.log(res)
    }, (err) => {
        console.log(err);
    })
}