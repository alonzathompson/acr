const smartcard = require('smartcard');
let ab2str = require('arraybuffer-to-string');
//const Iso7816Application = smartcard.Iso7816Application;

const uuid = require('uuid/v4');

const Devices = smartcard.Devices;
const devices = new Devices();
let currentDevices = [];
let CommandApdu = smartcard.CommandApdu;

const User = require("./models/user");
console.log(devices.listDevices());

module.exports = (socket) => {
    let cardData = {};
    cardData.asciiStrings = [];
    cardData.tryingToGetIn = false;
    cardData.cardUsers = [];
    let cardUtils = {};

    devices.on('device-activated', event => {

    console.log("Reader added :" + event.device);
    cardData.device = event.device;
    
    let device = event.device;//establish device

        device.on('card-inserted', event => {

            let card = event.card;//establisih card event
            cardData.type = card.getAtr();//get card type attr
            
            //console.log(`Card'${cardData.type}' inserted into '${event.device}'`);

            /*card.on('command-issued', event => {
                console.log(`Command '${event.command}' issued to '${event.card}' `);
            });

            card.on('response-received', event => {
                console.log(`Response '${event.response}' received from '${event.card}' in response to command'${event.command}'`);
            });*/

            /***************************
             * Actual Card Commands Being Issued
             */

            //get Card details
            cardUtils.getUID = () => {
                card
                .issueCommand("FF CA 00 00 00")//gets UID/serial number/enumeration identifier/
                .then((response) => {
                    cardData.UID = response.toString('hex');
                    return cardData.UID;
                }).catch((error) => {
                    console.error(error);
                }); 
            }

            //read data blocks
            //default is to read block 4 which holds login uuid
            cardUtils.readDataBlocks = async (cnt = 4, end = 4) => {
                let answers = [];

                if(cnt > 15 || end > 15){
                  return "number can not be greater than 15";
                }

                let arr = ["A","B","C","D","E","F"];
                for (let i = cnt, c = i - 10; i <= end; i++, c++){
                    if( i > 9 ) {
                    await card
                        .issueCommand(`FF B0 00 0${arr[c]} 10`)
                        .then((response) => {
                            cardData[`dataBlocks${i}`] = `${response.toString('hex')}`;
                            cardData[`dataStr${i}`] = `${ab2str(response)}`;
                            
                            answers.push(response.toString('hex'));
                        }).catch((error) => {
                            console.error(error);
                        }); 
                    } else {
                     await card
                        .issueCommand(`FF B0 00 0${i} 10`)
                        .then((response) => {
                            cardData[`dataBlocks${i}`] = response.toString('hex');
                            cardData[`dataStr${i}`] = `${ab2str(response)}`;
                            answers.push(response.toString('hex'));
                            cardData.rawArr = [...answers];
                        }).catch((error) => {
                            console.error(error);
                        });
                    }
                }
                answers = answers.join("").replace(/(9000)/g, "");
                //console.log(answers);
                return answers;
            }

            /********
             * Writing data blocks
             */

            //write data blocks
            cardUtils.writeUser = async (email, pass) => {
                let user = new User();
                let rfidID = cardUtils.generateCardId();

                user.email = email;
                user.password = pass;
                user.cardID = rfidID;

                user.save(function(err){
                    if(err){
                        console.log(err);
                    } else {
                        socket.emit('writeData', {
                            message: "wrote data to card " + rfidID
                        })
                    }
                });
            }

            //generate card id
            cardUtils.generateCardId = (bStart = 4) => {
                if(bStart > 15){
                  return "number can not be greater than 15";
                }

                let cardUUID = uuid();
                let cardid = cardUUID.replace(/(-)/g, "").toUpperCase();

                let count = 4, dataStr = "", temp = "";

                for(let i = 0; i <= cardid.length; i++){
                    temp += cardid[i];
                    if(temp.length % 2 === 0){
                        dataStr += temp + " ";
                        temp = "";
                    }
                    if(dataStr.length % 4 === 0 && dataStr !== ""){
                        card
                        .issueCommand(`FF D6 00 0${count} 04 ${dataStr}`)//
                        .catch((error) => {
                            console.error(error);
                        });
                        count = count + 1;
                        dataStr = "";
                    }
                }    
                return cardid;
            }

            /*cardUtils.getCleanAscii = () => {
                cardUtils.compileAllDataBlocks().then(async () => {
                let asciiData = cardData.pageData.replace(/\0/g, '').trim().split("-").sort();// \0 removes null char \u0000
                let arr = [];
                asciiData.forEach(function(el, i) {
                    if(el !== ''){
                        arr.push(el.trim().split(" ").sort());
                    }
                });
                    let temp = arr;
                    arr = [];
                    return temp;
                })
                .then((res) => {
                    let cleanData = [];
                    res.forEach((item, i, arr) => {
                        //console.log(item);
                        item.forEach((el, n, ar) => {
                            if(el.length > 1 && item[0] === el){
                                cleanData.push(el);
                            }
                        })
                    })
                    cardData.asciiStrings = [...cleanData];
                    //console.log("Clean", cleanData);
                    return cleanData;
                })
                .catch((err) => {
                    console.log(err);
                });
            };*/


            //handle leds
            cardUtils.handleLed = () => {
                card
                .issueCommand("FF 00 40 CF 04 03 00 01 01")//works turns led to orange
                .then((response) => {
                    console.log(`Response '${response.toString('hex')}`);
                }).catch((error) => {
                    console.error(error);
                });
            }

            /**********
             * Utilities that need to be called
             */
            let getDate = (user) => {
                if(user){
                    let d = new Date();
                    user.loginTime = `${d.toLocaleTimeString()} on ${d.toDateString()}`;
                    return user.loginTime;
                }
            }

            let isLoggedIn = (user) => {
                if(user.isLoggedIn){
                    return user.isLoggedIn = false;
                } else {
                    addToLoginCount(user);
                    return user.isLoggedIn = true;
                }
            }

            let handleUsersIn = (user) => {
                if(user.isLoggedIn === true){
                    cardData.cardUsers.push(user);
                    socket.emit("getAllUsers", cardData.cardUsers);
                    console.log("log in", cardData.cardUsers);
                    return cardData.cardUsers;
                }
            }
            
            let handleUsersOut = (user) => {
                if(user.isLoggedIn === false){
                    let temp = cardData.cardUsers;
                    let temp2 = temp.filter((item) => {
                        return item.email !== user.email;
                    })

                    cardData.cardUsers = [...temp2];
                    console.log("log out", cardData.cardUsers);
                    socket.emit("getAllUsers", cardData.cardUsers);
                    return cardData.cardUsers;
                }
            }

            let addToLoginCount = (user) => {
                user.loginCount = user.loginCount + 1;
            }

            let logMsg = (user) => {
                if(user.isLoggedIn){
                    return "has logged in"
                } else {
                    return "has logged out"
                }
            }

            cardUtils.logIn = async () => {
                let cardId = await cardUtils.readDataBlocks();
                let cardIdAllUpper = cardId.toUpperCase();

                await User.findOne({cardID: cardIdAllUpper}, function(err, user){
                    if(err || !user){
                        socket.emit('trying', `Unkown person is trying to gain access at ${getDate()}`);
                    } else {
                        isLoggedIn(user);
                        getDate(user);
                        user.tagType = cardUtils.getUID();
                        user.save();
                        handleUsersIn(user);
                        handleUsersOut(user);
                        //console.log(cardData.cardUsers);
                        socket.emit('trying', `${user.email} ${logMsg(user)} at ${user.loginTime}`);
                        return user;
                    }
                })        
            }

            console.log(cardData.cardUsers);


            cardUtils.logIn();
            
        });//end of device.on card-inserted
            //If card is removed
            device.on('card-removed', event => {
                socket.emit('removed', "card has been moved from reader");
            console.log(`Card removed from '${event.name}' `);
            });

    });//end of device.on card-activated

    cardUtils.data = cardData;
    return cardUtils;

    }//end of module.exports
