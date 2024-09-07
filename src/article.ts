import { Account } from './account'
import { ObjectId } from 'mongodb'

class ArticleServices {
  private db: any
  public articles: any
  public comments: any
  public cl: any
  private a: any
  private c: any

  constructor() {
    this.db = null
    this.articles = null
    this.comments = null
    this.cl = null
  }

  async init(db: any) {
    this.db = db
    this.articles = db.collection('Article')
    this.comments = db.collection('Comment')
    this.a = this.articles
    this.c = this.comments
    this.cl = this.articles
  }

  async getContent(id: number) {
    const article = await this.a.findOne(
      { id: id },
      {
        projection: {
          id: 1,
          author: 1,
          publishDate: 1,
          updateDate: 1,
          title: 1,
          tags: 1,
          official: 1,
          selected: 1,
          locked: 1,
          content: 1,
          images: 1,
          views: 1,
          likes: 1,
          comments: 1,
          shares: 1,
        },
      },
    )
    if (article) {
      const author = await Account.getInfo(article.author)
      if (author) {
        article.head = `https://q1.qlogo.cn/g?b=qq&nk=${author.qq}&s=100`
        article.name = author.name
      }
    }
    return article
  }

  async getInfo(id: number) {
    const article = await this.a.findOne(
      { id: id },
      {
        projection: {
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
        },
      },
    )
    if (article) {
      const author = await Account.getInfo(article.author)
      if (author) {
        article.head = `https://q1.qlogo.cn/g?b=qq&nk=${author.qq}&s=100`
        article.name = author.name
        article.isVIP = author.isVIP
        return article
      }
    }
  }

  async getArticles(list: Array<number>, page: number, size: number) {
    console.log(list, typeof list)
    const articles = await this.a.find({ id: { $in: list } },
      {
        projection: {
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
        },
      },)
      .skip((page - 1) * size)
      .limit(size)
      .toArray()

    for (const article of articles) {
      const author = await Account.getInfo(article.author)
      if (author) {
        article.head = `https://q1.qlogo.cn/g?b=qq&nk=${author.qq}&s=100`
        article.name = author.name
        article.isVIP = author.isVIP
      }
    }
    return articles
  }

  async getComments(
    id: number,
    page: number,
    size: number,
    sort: string,
  ): Promise<any[]> {
    try {
      // 计算跳过的记录数
      const skip = (page - 1) * size

      let sortField = ''

      if (sort === 'time') {
        sortField = 'publishDate'
      } else if (sort === 'hot') {
        sortField = 'likes'
      } else {
        sortField = 'likes' // 这里选择默认为按热度排序
      }

      const comments = this.c
        .find({
          articleID: id,
        })
        .skip(skip)
        .limit(size)
        .sort({ [sortField]: -1 })
        .toArray()
      return comments
    } catch (error) {
      console.error('Error fetching comments:', error)
      throw error
    }
  }

  async getCommentByID(articleID: number, commentID: string) {
    const commentIDObject = new ObjectId(commentID)
    const comment = await this.c.findOne({
      _id: commentIDObject,
      articleID: articleID,
    })
    return comment
  }

  async getReplies(
    articleID: number,
    commentID: string,
    page: number,
    size: number,
    sort: string,
  ) {
    try {
      // 计算跳过的记录数
      const skip = (page - 1) * size

      let sortField = ''

      if (sort === 'time') {
        sortField = 'publishDate'
      } else if (sort === 'hot') {
        sortField = 'likes'
      } else {
        sortField = 'likes' // 这里选择默认为按热度排序
      }

      const comments = this.c
        .find({
          articleID: articleID,
          replyTo: commentID,
        })
        .skip(skip)
        .limit(size)
        .sort({ [sortField]: -1 })
        .toArray()
      return comments
    } catch (error) {
      console.error('Error fetching comments:', error)
      throw error
    }
  }
}

export const Article = new ArticleServices()
