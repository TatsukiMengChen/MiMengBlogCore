// app.ts
import express, { Request, Response } from 'express'
const cors = require('cors')
import { Account } from './account'
import { connectToDatabase, getDatabase } from './database'
import { Search } from './search'
import { Article } from './article'
import { Content } from './content'

const app = express()
const port = 3001
async function getToken(
  req: Request,
): Promise<{ ret: true; token: string } | { ret: false; message: string }> {
  try {
    let authHeader = req.headers['authorization']
    let token = authHeader && authHeader.split(' ')[1]
    if (!token) {
      return { ret: false, message: 'Missing token' }
    }

    //回调Token
    return { ret: true, token: token as string }
  } catch (e) {
    console.error(e)
    return { ret: false, message: 'Internal Server Error' }
  }
}

//暂时不禁止跨域
const corsOptions = {
  origin: function (origin: any, callback: any) {
    const whitelist = ['http://localhost:5500', 'https://mimeng.fun']
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
}

app.use(cors())
app.use(express.json())

type AccountActionParams = {
  validateToken: { id: string }
  login: { id: string; password: string; result: any }
  register: {
    id: string
    password: string
    qq: string
    name: string
    result: any
  }
  getInfo: { id: string }
  getMyFollow: { id: string }
  follow: { id: string; target: string }
  unfollow: { id: string; target: string }
}

const accountActionParams: {
  [K in keyof AccountActionParams]: Array<keyof AccountActionParams[K]>
} = {
  validateToken: ['id'],
  login: ['id', 'password', 'result'],
  register: ['id', 'password', 'qq', 'name', 'result'],
  getInfo: ['id'],
  getMyFollow: ['id'],
  follow: ['id', 'target'],
  unfollow: ['id', 'target'],
}

type SearchActionParams = {
  search: {
    id: string
    keyword: string
    page: number
    sort: string
    reverse: boolean
  }
  searchArticles: {
    id: string
    keyword: string
    page: number
    sort: string
    reverse: boolean
  }
  searchArticlesByAuthor: {
    id: string
    keyword: string
    page: number
    sort: string
    reverse: boolean
  }
  searchArticlesByTag: {
    id: string
    keyword: string
    page: number
    sort: string
    reverse: boolean
  }
  searchUser: { id: string; keyword: string; page: number }
}

const searchActionParams: {
  [K in keyof SearchActionParams]: Array<keyof SearchActionParams[K]>
} = {
  search: ['id', 'keyword', 'page', 'sort', 'reverse'],
  searchArticles: ['page', 'sort', 'reverse'],
  searchArticlesByAuthor: ['page', 'sort', 'reverse'],
  searchArticlesByTag: ['id', 'keyword', 'page', 'sort', 'reverse'],
  searchUser: ['id', 'keyword', 'page'],
}

type ContentActionParams = {
  getRecommendedArticles: {}
  getNotice: {}
  getAD: {}
  getHotTags: {}
}

const contentActionParams: {
  [K in keyof ContentActionParams]: Array<keyof ContentActionParams[K]>
} = {
  getRecommendedArticles: [],
  getNotice: [],
  getAD: [],
  getHotTags: [],
}

type ArticleActionParams = {
  getContent: { id: number }
  getInfo: { id: number }
  getArticles: { list: Array<number> }
  modifyLike: { id: number; userID: string }
  getComments: { id: number; page: number; sort: string }
  getCommentByID: { articleID: number; commentID: string }
  getReplies: {
    articleID: number
    commentID: string
    page: number
    sort: string
  }
  publishArticle: {
    id: string
    title: string
    content: string
    tags: Array<string>
    outline: string
    images: Array<string>
  }
  editArticle: {
    userID: string
    id: number
    title: string
    content: string
    tags: Array<string>
    outline: string
    images: Array<string>
  }
  deleteArticle: {
    userID: string;
    id: number
  }
}

const articleActionParams: {
  [K in keyof ArticleActionParams]: Array<keyof ArticleActionParams[K]>
} = {
  getContent: ['id'],
  getInfo: ['id'],
  getArticles: ['list'],
  modifyLike: ['id', 'userID'],
  getComments: ['id', 'page', 'sort'],
  getCommentByID: ['articleID', 'commentID'],
  getReplies: ['articleID', 'commentID', 'page', 'sort'],
  publishArticle: ['id', 'title', 'content', 'tags', 'outline', 'images'],
  editArticle: ['userID', 'id', 'title', 'content', 'tags', 'outline', 'images'],
  deleteArticle: ['userID', 'id'],
}

// 参数验证函数
function validateParams(
  req: Request,
  actionParams: Record<string, Array<string>>,
  isNeedAct?: boolean,
) {
  // 检查请求方法，确定参数来源
  const querySource = req.query
  const bodySource = req.body

  // 确保 query 和 body 都不是 undefined
  if (req.method == 'GET' && !querySource) {
    const method = req.method.toLowerCase()
    return `${method} request is missing parameters`
  } else if (!querySource || !bodySource) {
    const method = req.method.toLowerCase()
    return `${method} request is missing parameters`
  }

  // 现在可以安全地解构 source
  const { act } = req.query // 假设 act 总是从 query 中获取

  if (!isNeedAct && !act) {
    return 'Missing action'
  }

  const requiredParams = actionParams[String(act)]
  if (!requiredParams) {
    return 'Invalid action'
  }

  // 合并 query 和 body 中的参数
  const combinedParams = { ...req.query, ...req.body }

  for (const param of requiredParams) {
    const paramValue = combinedParams[param]
    if (
      paramValue === undefined ||
      (typeof paramValue === 'string' && paramValue.trim() === '')
    ) {
      return `Missing required parameter: ${param}`
    }
  }

  // 验证通过
  return
}

let db

// 连接数据库
connectToDatabase()
  .then(() => {
    console.log('Connected to MongoDB')
    db = getDatabase()
    // 确保上云服务初始化
    Account.init(db)
      .then(() => console.log('Account service initialized'))
      .catch((err) => console.error('Error initializing account service', err))

    Article.init(db)
      .then(() => console.log('Article service initialized'))
      .catch((err) => console.error('Error initializing Article service', err))

    Content.init(db)
      .then(() => console.log('Content service initialized'))
      .catch((err) => console.error('Error initializing Content service', err))
  })
  .catch((_) => console.error('Error connecting to MongoDB'))

app.get('/user', async (req: Request, res: Response) => {
  const errorMessage = validateParams(req, accountActionParams)
  if (errorMessage) {
    return res.status(400).send(errorMessage)
  }

  try {
    const { act } = req.query
    switch (act) {
      case 'validateToken':
        var token = await getToken(req)
        if (token.ret) {
          var valid = await Account.validateToken(
            req.query.id as string,
            token.token,
          )
          if (valid) {
            res.status(200).json({ code: 0, msg: 'Token is valid' })
          } else {
            res.status(401).json({ code: 1, msg: 'Token is invalid' })
          }
        } else {
          res.status(401).send(token.message)
        }
        break
      case 'login':
        const loggedIn = await Account.login(
          req.query.id as string,
          req.query.password as string,
          req.query.result as any,
        )
        if ('status' in loggedIn) {
          res.status(loggedIn.status).send(loggedIn.message)
        } else {
          res.json(loggedIn)
        }
        break
      case 'register':
        const registeredIn = await Account.register(
          req.query.id as string,
          req.query.password as string,
          req.query.qq as string,
          req.query.name as string,
          req.query.result as any,
        )
        if ('status' in registeredIn) {
          res.status(registeredIn.status).send(registeredIn.message)
        } else {
          res.json(registeredIn)
        }
        break
      case 'getInfo':
        const accountInfo = await Account.getInfo(req.query.id as string)
        if (accountInfo) {
          res.json(accountInfo)
        } else {
          res.status(404).send('Account not found')
        }
        break
      case 'getMyFollow':
        var token = await getToken(req)
        if (token.ret) {
          const followed = await Account.getMyFollow(req.query.id as string, token.token)
          if (followed) {
            res.json(followed)
          }
        }
        break
      case 'follow':
        var token = await getToken(req)
        if (token.ret) {
          const followed = await Account.follow(
            req.query.id as string,
            req.query.target as string,
          )
          if (followed) {
            res.json(followed)
          } else {
            res.status(500).send('Internal Server Error')
          }
        } else {
          return res.status(401).send(token.message)
        }
        break
      case 'unfollow':
        var token = await getToken(req)
        if (token.ret) {
          const unfollowed = await Account.unfollow(
            req.query.id as string,
            req.query.target as string,
          )
          if (unfollowed) {
            res.json(unfollowed)
          } else {
            res.status(500).send('Internal Server Error')
          }
        } else {
          return res.status(401).send(token.message)
        }
        break
      default:
        res.status(400).send('Invalid action:' + act)
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
})

app.get('/search', async (req: Request, res: Response) => {
  const errorMessage = validateParams(req, searchActionParams)
  if (errorMessage) {
    return res.status(400).send(errorMessage)
  }

  try {
    const { act } = req.query
    //const account = await Account.findAccountByID(req.query.id as string)
    if (true) {
      //var token = await getToken(req)
      //if (token.ret) {
      if (true) {
        //if (account.token === token.token) {
        if (true) {
          switch (act) {
            case 'search':
              const search = await Search.search(
                req.query.keyword as string,
                Number(req.query.page),
                req.query.sort as string,
                JSON.parse(req.query.reverse as string) as boolean,
              )
              res.json(search)
              break
            case 'searchArticles':
              var token = await getToken(req)
              var articles
              if (token.ret) {
                articles = await Search.searchArticles(
                  req.query.keyword as string,
                  Number(req.query.page),
                  10,
                  req.query.sort as string,
                  JSON.parse(req.query.reverse as string) as boolean,
                  String(req.query.id),
                  token.token
                )
              } else {
                articles = await Search.searchArticles(
                  req.query.keyword as string,
                  Number(req.query.page),
                  10,
                  req.query.sort as string,
                  JSON.parse(req.query.reverse as string) as boolean
                )
              }
              res.json(articles)
              break
            case 'searchArticlesByAuthor':
              var token = await getToken(req)
              var articles
              if (token.ret) {
                articles = await Search.searchArticlesByAuthor(
                  req.query.keyword as string,
                  Number(req.query.page),
                  10,
                  req.query.sort as string,
                  JSON.parse(req.query.reverse as string) as boolean,
                  String(req.query.id),
                  token.token
                )
              } else {
                articles = await Search.searchArticlesByAuthor(
                  req.query.keyword as string,
                  Number(req.query.page),
                  10,
                  req.query.sort as string,
                  JSON.parse(req.query.reverse as string) as boolean
                )
              }
              res.json(articles)
              break
            case 'searchArticlesByTag':
              var token = await getToken(req)
              var articlesByTag
              if (token.ret) {
                articlesByTag = await Search.searchArticlesByTag(
                  req.query.keyword as string,
                  Number(req.query.page),
                  req.query.sort as string,
                  JSON.parse(req.query.reverse as string) as boolean,
                  String(req.query.id),
                  token.token
                )
              } else {
                articlesByTag = await Search.searchArticlesByTag(
                  req.query.keyword as string,
                  Number(req.query.page),
                  req.query.sort as string,
                  JSON.parse(req.query.reverse as string) as boolean,
                )
              }
              res.json(articlesByTag)
              break
            case 'searchUser':
              const users = await Search.searchUser(
                req.query.keyword as string,
                Number(req.query.page),
              )
              res.json(users)
              break
            default:
              res.status(400).send('Invalid action:' + act)
          }
        } else {
          res
            .status(401)
            .send('Unauthorized: Invalid token or account not found')
        }
      } else {
        //res.status(401).send(token.message)
      }
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
})

app.get('/content', async (req: Request, res: Response) => {
  const errorMessage = validateParams(req, contentActionParams)
  if (errorMessage) {
    return res.status(400).send(errorMessage)
  }

  try {
    const { act } = req.query
    switch (act) {
      case 'getRecommendedArticles':
        const recommendedArticles = await Content.getRecommendedArticles()
        res.json(recommendedArticles)
        break
      case 'getNotice':
        const notice = await Content.getNotice()
        res.json(notice)
        break
      case 'getAD':
        const ad = await Content.getAD()
        res.json(ad)
        break
      case 'getHotTags':
        const hotTags = await Content.getHotTags()
        res.json(hotTags)
        break
      default:
        res.status(400).send('Invalid action:' + act)
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
})

app.get('/article', async (req: Request, res: Response) => {
  const errorMessage = validateParams(req, articleActionParams)
  if (errorMessage) {
    return res.status(400).send(errorMessage)
  }

  try {
    const { act } = req.query
    switch (act) {
      case 'getContent':
        var token = await getToken(req)
        if (token.ret) {
          const content = await Article.getContent(Number(req.query.id), String(req.query.userID), token.token)
          res.json(content)
        } else {
          const content = await Article.getContent(Number(req.query.id))
          res.json(content)
        }
        break
      case 'getInfo':
        const info = await Article.getInfo(Number(req.query.id))
        res.json(info)
        break
      case 'getArticles':
        const articleIds = JSON.parse(String(req.query.list));
        var token = await getToken(req)
        var articles
        if (token.ret) {
          articles = await Article.getArticles(articleIds, 1, 10, String(req.query.userID), token.token);
        } else {
          articles = await Article.getArticles(articleIds, 1, 10);
        }
        res.json(articles)
        break
      case 'modifyLike':
        var token = await getToken(req)
        if (token.ret) {
          const like = await Article.modifyLike(Number(req.query.id), String(req.query.userID), token.token)
          res.json(like)
        }
        break
      case 'getComments':
        const comments = await Article.getComments(
          Number(req.query.id),
          Number(req.query.page),
          10,
          req.query.sort as string,
        )
        res.json(comments)
        break
      case 'getCommentByID':
        const comment = await Article.getCommentByID(
          Number(req.query.articleID),
          req.query.commentID as string,
        )
        res.json(comment)
        break
      case 'getReplies':
        const replies = await Article.getReplies(
          Number(req.query.articleID),
          req.query.commentID as string,
          Number(req.query.page),
          10,
          req.query.sort as string,
        )
        res.json(replies)
        break
      case 'publishArticle':
        var token = await getToken(req)
        if (token.ret) {
          var result = await Article.publishArticle(req.query.id as string, token.token, req.query.title as string, req.query.content as string, JSON.parse(String(req.query.tags)), req.query.outline as string, JSON.parse(String(req.query.images)))
          res.json(result)
        }
        break
      case 'editArticle':
        var token = await getToken(req)
        if (token.ret) {
          //editArticle(userID: string, token: string, id: number, title: string, content: string, tags: Array<string>, outline: string, images: Array<string>)
          var result = await Article.editArticle(req.query.userID as string, token.token, Number(req.query.id), req.query.title as string, req.query.content as string, JSON.parse(String(req.query.tags)), req.query.outline as string, JSON.parse(String(req.query.images)))
          res.json(result)
        }
        break
      case 'deleteArticle':
        var token = await getToken(req)
        if (token.ret) {
          var result = await Article.deleteArticle(req.query.userID as string, token.token, Number(req.query.id))
          res.json(result)
        }
        break
      default:
        res.status(400).send('Invalid action:' + act)
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
})

//测试接口
app.get('/experimental', (req: Request, res: Response) => {
  //@ts-ignore
  res.status(500).send('No open experimental function.')
})

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})
