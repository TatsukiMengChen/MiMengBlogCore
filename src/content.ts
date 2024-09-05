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
    const articles = await this.cl.findOne({ type: 'recommendedArticles' })
    return articles.content
  }

  async getNotice() {
    const notice = await this.cl.findOne({ type: 'notice' })
    return notice.content
  }

  async getAD() {
    const ad = await this.cl.findOne({ type: 'ad' })
    return ad.content
  }
}

export const Content = new ContentServices()
