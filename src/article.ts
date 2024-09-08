import { Account } from './account'
import { Code, ObjectId } from 'mongodb'

class ArticleServices {
  private db: any
  public articles: any
  public comments: any
  public tags: any
  public cl: any
  private a: any
  private c: any

  constructor() {
    this.db = null
    this.articles = null
    this.comments = null
    this.tags = null
    this.cl = null
  }

  async init(db: any) {
    this.db = db
    this.articles = db.collection('Article')
    this.comments = db.collection('Comment')
    this.tags = db.collection('Tag')
    this.a = this.articles
    this.c = this.comments
    this.cl = this.articles
  }

  async getContent(id: number) {
    // 首先获取文章信息
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
          outline: 1,
          content: 1,
          images: 1,
          views: 1,
          likes: 1,
          comments: 1,
          shares: 1,
        },
      },
    );

    if (article) {
      // 更新文章的浏览次数
      this.a.updateOne({ id: id }, { $inc: { views: 1 } });

      // 获取作者信息
      const author = await Account.getInfo(article.author);
      if (author) {
        article.head = `https://q1.qlogo.cn/g?b=qq&nk=${author.qq}&s=100`;
        article.name = author.name;
      }

      this.tags.updateMany({ name: { $in: article.tags } }, { $inc: { views: 1 } });

    }

    return article;
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

  async getArticles(list: Array<number>, page: number, size: number, userID?: string, token?: string) {
    if (userID && token) {
      var likes = await Account.checkLikes(userID, token, list)
    }
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

  async modifyLike(id: number, userID: string, token: string) {
    const vallid = await Account.validateToken(userID, token)
    if (!vallid) {
      return {
        code: 2,
        msg: 'token验证失败',
      }
    }
    const checkLikeInfo = await this.cl.findOne(
      {
        'id': id,
        'likeList.id': userID,
      },
      {
        projection: { _id: 0, likes: 1 },
      },
    )

    if (!checkLikeInfo) {
      //更新喜欢列表和喜欢人数
      const newPeople = { id: userID, date: Date.now() }
      Account.addLike(userID, token, id)
      const result = await this.cl.updateOne(
        { id: id },
        {
          $push: {
            likeList: newPeople,
          },
          $inc: { likes: 1 },
        },
      )

      if (result.matchedCount === 0) {
        throw new Error(
          'No article found with the provided ID or failed to update.',
        )
      } else {
        return {
          code: 0,
          msg: '添加喜欢成功',
        }
      }
    } else {
      Account.removeLike(userID, token, id)
      const result = await this.cl.updateOne(
        { id: id },
        {
          $pull: {
            likeList: { id: userID },
          },
          $inc: { likes: -1 },
        },
      )

      if (result.matchedCount === 0) {
        throw new Error(
          'No article found with the provided ID or failed to update.',
        )
      } else {
        return {
          code: 1,
          msg: '取消喜欢成功',
        }
      }
    }
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

  async updateTag(tag: string) {
    var result = await this.tags.findOne({ name: tag })
    if (result) {
      await this.tags.updateOne({ name: tag }, { $inc: { articles: 1 } })
    } else {
      await this.tags.insertOne({ name: tag, views: 0, articles: 1 })
    }
  }

  async publishArticle(userID: string, token: string, title: string, content: string, tags: Array<string>, outline: string, images: Array<string>) {
    var valid = await Account.validateToken(userID, token)
    if (valid) {
      //获取文章总数
      const count = await this.cl.countDocuments()
      const article = {
        id: count + 1,
        author: userID,
        publishDate: Date.now(),
        updateDate: Date.now(),
        title: title,
        content: content,
        tags: tags,
        outline: outline,
        images: images,
        locked: true,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        stars: 0
      }

      var lastUpdateTime = await Account.cl.findOne({
        id: userID,
      }, {
        projection: {
          _id: 0,
          lastUpdateTime: 1,
        },
      })

      //判断是否为1分钟内
      if (lastUpdateTime.lastUpdateTime + 60000 > Date.now()) {
        return {
          code: 1,
          status: 403,
          message: '发布失败，请等待1分钟后再发布',
        }
      }

      var result = await this.cl.insertOne(article)
      if (result) {
        Account.cl.updateOne(
          { id: userID },
          { $set: { lastUpdateTime: Date.now() } }
        )
        for (var tag of tags) {
          this.updateTag(tag)
        }
        return {
          code: 0,
          status: 200,
          message: '发布成功',
        }
      }
    }
  }

  async editArticle(userID: string, token: string, id: number, title: string, content: string, tags: Array<string>, outline: string, images: Array<string>) {
    var valid = await Account.validateToken(userID, token)
    if (valid) {

      var lastUpdateTime = await Account.cl.findOne({
        id: userID,
      }, {
        projection: {
          _id: 0,
          lastUpdateTime: 1,
        },
      })

      //判断是否为1分钟内
      if (lastUpdateTime.lastUpdateTime + 60000 > Date.now()) {
        return {
          code: 1,
          status: 403,
          message: '发布失败，请等待1分钟后再发布',
        }
      }

      //获取原有tags
      var oldTags = await this.cl.findOne({
        id: id,
      }, {
        projection: {
          _id: 0,
          tags: 1,
        },
      })
      var oldTagsArray = oldTags.tags
      var newTagsArray = tags
      //比对tags，如果旧tags被删除，则articles-1，如果有新tag，则updateTag
      for (var tag of oldTagsArray) {
        if (!newTagsArray.includes(tag)) {
          await this.tags.updateOne({ name: tag }, { $inc: { articles: -1 } })
        }
      }

      //修改文章
      var result = await this.cl.updateOne(
        { id: id },
        {
          $set: {
            updateDate: Date.now(),
            title: title,
            content: content,
            tags: tags,
            outline: outline,
            images: images,
          },
        }
      )
      if (result) {
        for (var t of tags) {
          this.updateTag(t)
        }
        Account.cl.updateOne(
          { id: userID },
          { $set: { lastUpdateTime: Date.now() } }
        )
        return {
          code: 0,
          status: 200,
          message: '修改成功',
        }
      } else {
        return {
          code: 1,
          status: 403,
          message: '修改失败',
        }
      }
    }
  }

  async deleteArticle(userID: string, token: string, id: number) {
    var valid = await Account.validateToken(userID, token)
    if (valid) {
      //获取tags
      var tags = await this.cl.findOne({
        id: id,
        author: userID,
      }, {
        projection: {
          _id: 0,
          tags: 1,
        },
      })
      if (!tags) {
        return {
          code: 1,
          status: 403,
          message: '删除失败，文章不存在',
        }
      }
      var tagsArray = tags.tags
      //tags articles -1
      for (var tag of tagsArray) {
        this.tags.updateOne({ name: tag }, { $inc: { articles: -1 } })
      }
      var result = await this.cl.deleteOne({ id: id })
      if (result) {
        return {
          code: 0,
          status: 200,
          message: '删除成功',
        }
      } else {
        return {
          code: 1,
          status: 403,
          message: '删除失败',
        }
      }
    }
  }
}


export const Article = new ArticleServices()
