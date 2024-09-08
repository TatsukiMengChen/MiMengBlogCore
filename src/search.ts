import { Account } from './account'
import { Article } from './article'

function filterDefinedProps(obj: any) {
  return Object.keys(obj).reduce((acc: any, key) => {
    if (obj[key] !== undefined) {
      acc[key] = obj[key]
    }
    return acc
  }, {})
}

class SearchService {
  async search(
    keyword: string,
    page: number,
    sort?: string,
    reverse?: boolean,
  ) {
    const Sort = sort || 'hot'
    const Reverse = reverse || false
    page = Math.floor(page)
    if (page < 1) {
      page = 1
    }
    const limit = 10
    const [users, articles] = await Promise.all([
      this.searchUsers(keyword, page, limit),
      this.searchArticles(keyword, page, limit, Sort, Reverse),
    ])

    return {
      users: users,
      articles: articles,
    }
  }

  async searchArticle(
    keyword: string,
    page: number,
    sort?: string,
    reverse?: boolean,
  ) {
    const Sort = sort || 'hot'
    const Reverse = reverse || false
    page = Math.floor(page)
    if (page < 1) {
      page = 1
    }
    const limit = 10
    const articles = await this.searchArticles(
      keyword,
      page,
      limit,
      Sort,
      Reverse,
    )

    return articles
  }

  async searchArticlesByTag(
    keyword: string,
    page: number,
    sort?: string,
    reverse?: boolean,
    userID?: string,
    token?: string,
  ) {
    const Sort = sort || 'hot'
    const Reverse = reverse || false
    page = Math.floor(page)
    if (page < 1) {
      page = 1
    }
    const limit = 10

    const skip = (page - 1) * limit

    const projection = {
      _id: 0,
      id: 1,
      author: 1,
      publishDate: 1,
      updateDate: 1,
      title: 1,
      tags: 1,
      official: 1,
      selected: 1,
      locked: 1,
      outline: 1,
      images: 1,
      views: 1,
      likes: 1,
      comments: 1,
      stars: 1,
    }

    let sortField = ''
    let sortOrder = 1 // 1 表示升序，-1 表示降序

    if (sort === 'time') {
      sortField = 'updateDate'
    } else if (sort === 'hot') {
      sortField = 'views'
    } else {
      0
      sortField = 'hot' // 这里选择默认为按热度排序
    }

    // 根据reverse参数设置排序顺序
    if (reverse) {
      sortOrder = 1
    } else {
      sortOrder = -1
    }

    const articles = await Article.cl
      .find(
        {
          tags: {
            $elemMatch: {
              $eq: keyword,
            },
          },
        },
        { projection: projection },
      )
      .skip(skip)
      .limit(limit)
      .sort({ [sortField]: sortOrder })
      .toArray()


    var list = []
    for (const article of articles) {
      list.push(article.id)
    }

    if (userID && token) {
      var likes = await Account.checkLikes(userID, token, list)
    }

    for (const article of articles) {
      if (likes) {
        if (likes.includes(article.id)) {
          article.liked = true
        }
      }
      const author = await Account.getInfo(article.author)
      if (author) {
        article.head = `https://q1.qlogo.cn/g?b=qq&nk=${author.qq}&s=100`
        article.name = author.name
        article.isVIP = author.isVIP
      }
    }

    return articles
  }

  async searchUser(keyword: string, page: number) {
    //确保page是整数
    page = Math.floor(page)
    if (page < 1) {
      page = 1
    }
    const limit = 10
    const users = await this.searchUsers(keyword, page, limit)

    return users
  }

  async searchArticles(
    keyword: string,
    page: number,
    limit: number,
    sort: string,
    reverse: boolean,
    userID?: string,
    token?: string,
  ) {
    console.log('searchArticles', keyword, page, limit, sort, reverse, userID, token)
    const skip = (page - 1) * limit

    // 定义返回字段的投影
    const projection = {
      _id: 0,
      id: 1,
      author: 1,
      publishDate: 1,
      updateDate: 1,
      title: 1,
      tags: 1,
      official: 1,
      selected: 1,
      locked: 1,
      outline: 1,
      images: 1,
      views: 1,
      likes: 1,
      comments: 1,
      stars: 1,
    }

    let sortField = ''
    let sortOrder = 1 // 1 表示升序，-1 表示降序

    if (sort === 'time') {
      sortField = 'updateDate'
    } else if (sort === 'hot') {
      sortField = 'views'
    } else {
      sortField = 'hot' // 这里选择默认为按热度排序
    }

    // 根据reverse参数设置排序顺序
    if (reverse) {
      sortOrder = 1
    } else {
      sortOrder = -1
    }

    // 执行查询并应用投影，跳过和限制结果
    var articles
    if (keyword) {
      articles = await Article.cl
        .find(
          {
            $or: [
              { title: { $regex: keyword, $options: 'i' } },
              { outline: { $regex: keyword, $options: 'i' } },
              { tags: { $elemMatch: { $regex: keyword, $options: 'i' } } },
            ],
          },
          { projection: projection },
        )
        .skip(skip)
        .limit(limit)
        .sort({ [sortField]: sortOrder }) // 应用排序
        .toArray()
    } else {
      articles = await Article.cl
        .find(
          {
            // 省略 $or 条件，或者设置一个始终为真的条件
          },
          { projection: projection },
        )
        .skip(skip)
        .limit(limit)
        .sort({ [sortField]: sortOrder }) // 应用排序
        .toArray();
    }

    var list = []
    for (const article of articles) {
      list.push(article.id)
    }

    if (userID && token) {
      var likes = await Account.checkLikes(userID, token, list)
    }

    for (const article of articles) {
      if (likes) {
        if (likes.includes(article.id)) {
          article.liked = true
        }
      }
      const author = await Account.getInfo(article.author)
      if (author) {
        article.head = `https://q1.qlogo.cn/g?b=qq&nk=${author.qq}&s=100`
        article.name = author.name
        article.isVIP = author.isVIP
      }
    }
    return articles
  }

  async searchArticlesByAuthor(
    keyword: string,
    page: number,
    limit: number,
    sort?: string,
    reverse?: boolean,
    userID?: string,
    token?: string,
  ) {
    const skip = (page - 1) * limit

    // 定义返回字段的投影
    const projection = {
      _id: 0,
      id: 1,
      author: 1,
      publishDate: 1,
      updateDate: 1,
      title: 1,
      tags: 1,
      official: 1,
      selected: 1,
      locked: 1,
      outline: 1,
      images: 1,
      views: 1,
      likes: 1,
      comments: 1,
      stars: 1,
    }

    let sortField = ''
    let sortOrder = 1 // 1 表示升序，-1 表示降序

    if (sort === 'time') {
      sortField = 'updateDate'
    } else if (sort === 'hot') {
      sortField = 'views'
    } else {
      sortField = 'hot' // 这里选择默认为按热度排序
    }

    // 根据reverse参数设置排序顺序
    if (reverse) {
      sortOrder = 1
    } else {
      sortOrder = -1
    }

    // 执行查询并应用投影，跳过和限制结果
    var articles
    if (keyword) {
      articles = await Article.cl
        .find(
          {
            author: keyword,
          },
          { projection: projection },
        )
        .skip(skip)
        .limit(limit)
        .sort({ [sortField]: sortOrder }) // 应用排序
        .toArray()
    } else {
      articles = await Article.cl
        .find(
          {

          },
          { projection: projection },
        )
        .skip(skip)
        .limit(limit)
        .sort({ [sortField]: sortOrder }) // 应用排序
        .toArray();
    }

    var list = []
    for (const article of articles) {
      list.push(article.id)
    }

    if (userID && token) {
      var likes = await Account.checkLikes(userID, token, list)
    }

    for (const article of articles) {
      if (likes) {
        if (likes.includes(article.id)) {
          article.liked = true
        }
      }
      const author = await Account.getInfo(article.author)
      if (author) {
        article.head = `https://q1.qlogo.cn/g?b=qq&nk=${author.qq}&s=100`
        article.name = author.name
        article.isVIP = author.isVIP
      }
    }
    return articles
  }

  async searchUsers(keyword: string, page: number, limit: number) {
    const skip = (page - 1) * limit // 计算需要跳过的条目数

    // 定义返回字段的投影
    const projection = {
      id: 1,
      name: 1,
      qq: 1,
      registerDate: 1,
      miniuid: 1,
      profile: 1,
      vipDate: 1,
      _id: 0,
    }

    const users = await Account.cl
      .find(
        {
          $or: [{ name: { $regex: keyword, $options: 'i' } }, { id: keyword }],
        },
        { projection: projection },
      ) // 应用投影参数
      .skip(skip)
      .limit(limit)
      .toArray()

    // 使用辅助函数过滤用户对象
    const sanitizedUsers = users.map((user: any) => {
      const isVIP = user.vipDate && user.vipDate > Date.now()
      return filterDefinedProps({
        id: user.id,
        name: user.name,
        head: `https://q1.qlogo.cn/g?b=qq&nk=${user.qq}&s=100`,
        registerDate: user.registerDate,
        miniuid: user.miniuid,
        isVIP: isVIP,
        profile: user.profile,
      })
    })
    return sanitizedUsers
  }
}

export const Search = new SearchService()
