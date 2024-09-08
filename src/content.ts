class ContentServices {
  private db: any
  public cl: any
  public tags: any

  constructor() {
    this.db = null
    this.cl = null
    this.tags = null
  }

  async init(db: any) {
    this.db = db
    this.cl = db.collection('Content')
    this.tags = db.collection('Tag')
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

  async getHotTags() {
    const tags = await this.tags.find(
      {},
      {
        projection: { _id: 0, name: 1, views: 1 },
      }
    ).sort({ views: -1 }).limit(10).toArray()
    return tags
  }

}

export const Content = new ContentServices()
