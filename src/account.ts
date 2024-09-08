import { profile } from 'console'
import { Long } from 'mongodb'
const axios = require('axios')
const crypto = require('crypto')

function filterDefinedProps(obj: any) {
  return Object.keys(obj).reduce((acc: any, key) => {
    if (obj[key] !== undefined) {
      acc[key] = obj[key]
    }
    return acc
  }, {})
}

interface AccountDocument {
  _id: { $oid: string }
  id: string
  password: string
  token: string
  name: string
  qq: string
  date: Long
  vipDate: Long
  miniuid: string
  inergral: number
  signInDate: Long
}

class AccountService {
  private db: any
  public cl: any

  constructor() {
    this.db = null
    this.cl = null
  }

  async init(db: any) {
    this.db = db
    this.cl = db.collection('Account')
  }

  async findAccountByUid(uid: string): Promise<AccountDocument | null> {
    return this.cl.findOne({ _id: { $oid: uid } }, {
      projection: {
        id: 1,
        password: 1,
        token: 1,
        qq: 1,
        name: 1,
        registerDate: 1,
        signInDate: 1,
        miniuid: 1,
        integral: 1,
        followersCount: 1,
        profile: 1,
        vipDate: 1,
      },
    })
  }

  async findAccountByID(id: string): Promise<AccountDocument | null> {
    return this.cl.findOne({ id: id }, {
      projection: {
        id: 1,
        password: 1,
        token: 1,
        qq: 1,
        name: 1,
        registerDate: 1,
        signInDate: 1,
        miniuid: 1,
        integral: 1,
        followersCount: 1,
        profile: 1,
        vipDate: 1,
      },
    })
  }

  //校验Token，通过账号ID和Token，校验成功直接返回账号数据
  async validateAccountToken(
    id: string,
    token: string,
  ): Promise<AccountDocument | null> {
    const account = await this.cl.findOne({ id: id }, { projection: { id: 1 } })
    if (!account) {
      return null
    }
    if (account.token !== token) {
      return null
    }
    return account
  }

  //校验Token，通过账号ID和Token，校验成功返回布尔值
  async validateToken(id: string, token: string): Promise<boolean> {
    const account = await this.cl.findOne({ id: id })
    if (!account) {
      return false
    }
    if (account.token !== token) {
      return false
    }
    return true
  }

  async login(
    id: string,
    password: string,
    result: any,
  ): Promise<
    AccountDocument | { status: number; message: string; data?: any }
  > {
    if (isValidID(id) && isValidPassword(password)) {
      const sign_token = crypto
        .createHmac('sha256', '0a08b994cb0851fea045ee5fc4ad5efa')
        .update(result.lot_number)
        .digest('hex')
      const query = Object.assign(result, {
        sign_token,
      })
      const captchaResult = await axios({
        method: 'get',
        params: query,
        url: 'http://gcaptcha4.geetest.com/validate',
      })
        .then((res: any) => {
          return res.data
        })
        .catch(() => {
          return { result: 'success', reason: 'request geetest api fail' }
        })

      if (captchaResult.result === 'success') {
        const account = await this.cl.findOne({ id: id, password: password }, {
          projection: {
            id: 1,
            token: 1,
            password: 1,
            qq: 1,
            name: 1,
            admin: 1,
            registerDate: 1,
            signInDate: 1,
            followersCount: 1,
            articlesCount: 1,
            profile: 1,
            vipDate: 1,
          },
        })
        if (!account) {
          return { status: 404, message: 'Account not found' }
        }
        if (account.password !== password) {
          return { status: 401, message: 'Invalid password' }
        }

        const newToken = generateToken()
        account.token = newToken
        const result = await this.cl.updateOne(
          { id: id },
          { $set: { token: newToken } },
        )
        if (result.modifiedCount === 0) {
          throw new Error('Failed to update account token')
        } else {
          return account
        }
      } else {
        return { status: 401, message: 'Invalid captcha' }
      }
    } else {
      return { status: 401, message: 'Invalid login infomation' }
    }
  }

  async register(
    id: string,
    password: string,
    qq: string,
    name: string,
    result: any,
  ): Promise<
    AccountDocument | { status: number; message: string; data?: any }
  > {
    if (
      isValidID(id) &&
      isValidPassword(password) &&
      isValidQQ(qq) &&
      isValidName(name)
    ) {
      const sign_token = crypto
        .createHmac('sha256', 'defa42ef66e7b4276a56b786ed2fdd2a')
        .update(result.lot_number)
        .digest('hex')
      const query = Object.assign(result, {
        sign_token,
      })
      const captchaResult = await axios({
        method: 'get',
        params: query,
        url: 'http://gcaptcha4.geetest.com/validate',
      })
        .then((res: any) => {
          return res.data
        })
        .catch(() => {
          return { result: 'success', reason: 'request geetest api fail' }
        })
      console.log(captchaResult)

      if (captchaResult.result === 'success') {
        const account = await this.cl.findOne({ id: id }, {
          projection: {
            id: 1,
          }
        })
        if (!account) {
          try {
            const now = new Date()
            const newAccount = await this.cl.insertOne({
              id: id,
              password: password,
              qq: qq,
              name: name,
              registerDate: Long.fromNumber(now.getTime()),
              vipDate: null,
              miniuid: null,
              token: generateToken(),
            })
            const account = await this.cl.findOne({
              _id: newAccount.insertedId,
            })
            console.log('Account created: ', id)
            return account
          } catch (error) {
            console.error(error)
            return { status: 500, message: 'Internal server error' }
          }
        } else {
          return { status: 401, message: 'Account already exists' }
        }
      } else {
        return { status: 401, message: 'Invalid captcha' }
      }
    } else {
      return { status: 401, message: 'Invalid register infomation' }
    }
  }

  async getInfo(id: string): Promise<any | null> {
    const account = await this.cl.findOne({ id: id }, {
      projection: {
        id: 1,
        qq: 1,
        name: 1,
        registerDate: 1,
        signInDate: 1,
        miniuid: 1,
        integral: 1,
        followersCount: 1,
        profile: 1,
        vipDate: 1,
      },
    })

    if (!account) {
      return null
    }

    // 计算当前是否为VIP
    const isVIP = this.isVIP(account)

    // 创建一个新的对象，仅包含非敏感信息和isVIP状态
    const safeAccount = filterDefinedProps({
      id: account.id,
      name: account.name,
      qq: account.qq,
      date: account.date,
      miniuid: account.miniuid,
      isVIP, // 添加isVIP状态
    })

    return safeAccount
  }

  isVIP(accountDocument: AccountDocument): boolean {
    const now = Long.fromNumber(Date.now())

    if (!accountDocument.vipDate) {
      return false
    }
    return accountDocument.vipDate > now
  }

  //预留接口，用于后续扩展
  async extendVIP(id: string, daysToAdd: number): Promise<any> {
    try {
      const accountDocument = await this.findAccountByID(id)
      if (!accountDocument) {
        throw new Error('Account not found.')
      }
      const now = Date.now()
      var newVIPDate
      if (!accountDocument.vipDate) {
        newVIPDate = new Date(now)
      } else {
        newVIPDate = new Date(Math.max(Number(accountDocument.vipDate), now))
      }

      newVIPDate.setDate(newVIPDate.getDate() + daysToAdd)
      const result = await this.cl.updateOne(
        { id: id },
        { $set: { vipDate: Long.fromNumber(newVIPDate.getTime()) } },
      )

      if (result.matchedCount === 0) {
        throw new Error(
          'No account found with the provided ID or failed to update.',
        )
      }

      return result
    } catch (error) {
      console.error('Failed to extend VIP:', error)
      throw error
    }
  }

  isSameDay(timestamp1: number, timestamp2: number): boolean {
    const date1 = new Date(timestamp1)
    const date2 = new Date(timestamp2)

    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  //预留签到接口
  async singIn(id: string, token: string): Promise<any> {
    const account = await this.cl.findOne({ id: id }, {
      projection: {
        id: 1,
        token: 1,
        name: 1,
        signInDate: 1,
        integral: 1,
        vipDate: 1,
      },
    })
    if (account) {
      if (account.token === token) {
        const now = Date.now()
        if (!this.isSameDay(Number(account.signInDate), now)) {
          if (account.integral) {
            account.integral += 1
          } else {
            account.integral = 1
          }
          await this.cl.updateOne(
            { id: id },
            {
              $set: {
                integral: account.integral,
                signInDate: Long.fromNumber(now),
              },
            },
          )
          return {
            code: 0,
            msg: '签到成功',
            date: now,
            integral: account.integral,
          }
        } else {
          return {
            code: 1,
            date: now,
            msg: '今日已签到',
            integral: account.integral,
          }
        }
      } else {
        return {
          code: 2,
          msg: 'token错误',
        }
      }
    } else {
      return {
        code: 3,
        msg: '账号不存在',
      }
    }
  }

  async isSignedIn(id: string, token: string): Promise<any> {
    const account = await this.cl.findOne({ id: id }, {
      projection: {
        id: 1,
        token: 1,
        name: 1,
        signInDate: 1,
        integral: 1,
      }
    })
    if (account) {
      if (account.token === token) {
        const now = Date.now()
        if (!this.isSameDay(Number(account.signInDate), now)) {
          return {
            code: 0,
            lastSignDate: account.signInDate,
            integral: account.integral,
            msg: '今日未签到',
          }
        } else {
          return {
            code: 1,
            lastSignDate: account.signInDate,
            integral: account.integral,
            msg: '今日已签到',
          }
        }
      } else {
        return {
          code: 2,
          msg: 'token错误',
        }
      }
    } else {
      return {
        code: 3,
        msg: '账号不存在',
      }
    }
  }

  //预留积分接口
  async addIntegral(id: string, integral: number): Promise<any> {
    const result = await this.cl.updateOne(
      { id: id },
      { $inc: { integral: integral } },
    )
    if (result.matchedCount === 0) {
      throw new Error(
        'No account found with the provided ID or failed to update.',
      )
    } else {
      return result
    }
  }

  async subIntegral(id: string, integral: number): Promise<any> {
    const result = await this.cl.updateOne(
      { id: id },
      { $inc: { integral: -integral } },
    )
    if (result.matchedCount === 0) {
      throw new Error(
        'No account found with the provided ID or failed to update.',
      )
    } else {
      return result
    }
  }

  async checkLikes(id: string, token: string, articles: Array<number>): Promise<any> {
    const result = await this.cl.findOne({ id: id, token: token }, {
      projection: {
        _id: 0,
        myLike: 1,
      }
    })
    if (result) {
      const myLike = result.myLike
      const likes = []
      for (var i in articles) {
        if (myLike.includes(articles[i])) {
          likes.push(articles[i])
        }
      }
      return likes
    }
  }

  async addLike(id: string, token: string, article: number): Promise<any> {
    const result = await this.cl.updateOne(
      { id: id },
      { $push: { myLike: article } },
    )
    if (result.matchedCount === 0) {
      throw new Error(
        'No account found with the provided ID or failed to update.',
      )
    } else {
      return result
    }
  }

  async removeLike(id: string, token: string, article: number): Promise<any> {
    const result = await this.cl.updateOne(
      { id: id },
      { $pull: { myLike: article } },
    )
    if (result.matchedCount === 0) {
      throw new Error(
        'No account found with the provided ID or failed to update.',
      )
    }
    else {
      return result
    }
  }

  async getMyFollow(id: string, token: string): Promise<any> {
    const result = await this.cl.findOne(
      { id: id, token: token },
      { projection: { _id: 0, myFollow: 1 } },
    )
    if (result) {
      if (result.myFollow) {
        const myFollow = await this.cl.find({ id: { $in: result.myFollow } }, {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            qq: 1,
            followersCount: 1,
            lastUpdateTime: 1,
          }
        }).toArray()
        for (var i in myFollow) {
          myFollow[i].head = `https://q1.qlogo.cn/g?b=qq&nk=${myFollow[i].qq}&s=100`
          myFollow[i].qq = undefined
        }
        return myFollow
      } else {
        return []
      }
    } else {
      return []
    }
  }

  async follow(id: string, target: string): Promise<any> {
    const newFollower = {
      id: id,
      date: Date.now(),
    }

    //检测是否已经关注
    const checkFollowInfo = await this.cl.findOne(
      {
        'id': target,
        'followers.id': id,
      },
      {
        projection: { _id: 0, followersCount: 1 },
      },
    )

    if (!checkFollowInfo) {
      //添加目标到我的关注列表
      const r = await this.cl.updateOne(
        { id: id },
        {
          $push: {
            myFollow: target,
          },
        }
      )
      //更新关注列表和关注人数
      const result = await this.cl.updateOne(
        { id: target },
        {
          $push: {
            followers: newFollower,
          },
          $inc: { followersCount: 1 }, // 增加followersCount
        },
      )

      if (result.matchedCount === 0) {
        throw new Error(
          'No account found with the provided ID or failed to update.',
        )
      } else {
        return {
          code: 0,
          msg: '关注成功',
        }
      }
    } else {
      return {
        code: 1,
        msg: '已关注',
      }
    }
  }

  async unfollow(accountId: string, targetId: string,): Promise<any> {
    const checkFollowInfo = await this.cl.findOne(
      {
        'id': targetId,
        'followers.id': accountId,
      },
      {
        projection: { _id: 0, followersCount: 1 },
      },
    )

    if (checkFollowInfo) {
      //从我的关注列表中移除目标
      const r = await this.cl.updateOne(
        { id: accountId },
        {
          $pull: {
            myFollow: targetId,
          },
        }
      )
      //更新关注列表和关注人数
      const result = await this.cl.updateOne(
        { id: targetId },
        {
          $pull: {
            followers: { id: accountId },
          },
          $inc: { followersCount: -1 }, // 减少followersCount
        },
      )

      if (result.matchedCount === 0) {
        throw new Error(
          'No account found with the provided ID or failed to update.',
        )
      } else {
        return {
          code: 0,
          msg: '取消关注成功',
        }
      }
    } else {
      return {
        code: 1,
        msg: '未关注',
      }
    }
  }
}

function isValidID(id: string) {
  const regex = /^\w{6,20}$/
  return regex.test(id)
}

function isValidPassword(password: string) {
  const regex = /^[A-Za-z0-9]+$/
  // 检查密码是否为 64 个字符，并且只包含数字和大小写字母
  return password.length === 64 && regex.test(password)
}

function isValidName(name: string) {
  const regex = /^[\u4e00-\u9fa5\w]{1,20}$/
  return regex.test(name)
}

function isValidQQ(qq: string) {
  const regex = /^\d{5,10}$/
  return regex.test(qq)
}

function generateToken() {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const tokenLength = 64
  let token = ''

  for (let i = 0; i < tokenLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    token += characters[randomIndex]
  }

  return token
}

export const Account = new AccountService()
