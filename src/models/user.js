const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

let key = "TheLOGBlogDOGFml";
//let iv = new Buffer("asfla6787uh86kai", "hex");
//let enc, dec;

let userSchema = mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  timeStamp: {
    type: Date,
    default: Date.now
  },
  cardID: {
    type: String,
    unique: true,
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  },
  loginTime: {
    type: String,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  tagType: {
    type: String,
    default:""
  },
  // user
  userInfo: {
    name: {
      type: String,
      default: ''
    },
    address: {
      name: {
        type: String,
        default: ''
      },
      street: {
        type: String,
        default: ''
      },
      zipcode: {
        type: String,
        default: ''
      }
    }
  } // post from user
})

userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)
}

userSchema.methods.validPassword = function (password) {
  if (this.password != null) {
    return bcrypt.compareSync(password, this.password)
  } else {
    return false
  }
}

userSchema.methods.generateCardHash = function (cardId) {
  //enc = crypto.createDecipher('aes-256-ctr', key).update(cardId, "utf-8", "hex"); 
  this.cardID = crypto.createCipher('aes-256-cbc', key).update(cardId, "utf-8", "hex");
  let temp = this.cardID;
  return temp
}

userSchema.methods.validateCardId = function (cardId) {
  if(cardId !== null) {
    return cardId === crypto.createDecipher('aes-256-cbc', key).update(this.cardID, "hex");
  } else {
    return false;
  }
}

userSchema.methods.checkIsLoggedIn = function (cardId) {
  if(cardId !== null) {
    return cardId 
  } else {
    return false;
  }
}

module.exports = mongoose.model('User', userSchema)
