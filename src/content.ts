class ContentServices {
  private db: any
  public cl: any

  constructor() {
    this.db = null
    this.cl = null
  }

  async init(db: any) {
    this.db = db
    this.cl = db.collection('Content')
  }

  async getRecommendedArticles() {
    const articles = await this.cl.findOne({ type: 'recommendededArticles' }, { projection: { _id: 0 } })
    return articles.articles
  }

  async getNotice() {
    const notice = await this.cl.findOne({ type: 'notice' }, { projection: { _id: 0 } })
    return notice
  }

  async getAD() {
    const ad = await this.cl.findOne({ type: 'ad' }, { projection: { _id: 0 } })
    return ad.content
  }
}

export const Content = new ContentServices()
