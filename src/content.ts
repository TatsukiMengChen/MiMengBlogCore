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

  async getRecommendedArticles(page: number, size: number) {
    const articles = await this.cl.findOne({ type: 'recommendedArticles' }, { projection: { _id: 0 } })
    return articles.content
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
