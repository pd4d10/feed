const Koa = require('koa')
const KoaRouter = require('koa-router')
const fetch = require('node-fetch')
const Feed = require('feed')
const marked = require('marked')

const app = new Koa()
const router = new KoaRouter()

router.get('/github-issue/:owner/:repo', async ctx => {
  const { owner, repo } = ctx.params
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=all`
  )
  const issues = await res.json()
  // const issues = require('./data')

  const feed = new Feed({
    title: `Issues - ${owner}/${repo}`,
    description: `GitHub issues of ${owner}/${repo}`,
    id: `https://github.com/${owner}/${repo}/issues`,
    link: `https://github.com/${owner}/${repo}/issues`,
    author: {
      name: owner,
      link: `https://github.com/${owner}`,
    },
  })

  issues.forEach(issue => {
    feed.addItem({
      title: issue.title,
      id: issue.id,
      link: issue.html_url,
      content: marked(issue.body),
      author: [
        {
          name: issue.user.login,
          link: issue.user.html_url,
        },
      ],
      date: new Date(issue.created_at),
    })
  })

  ctx.set('Content-Type', 'application/atom+xml')
  ctx.body = feed.atom1()
})

router.get('/zhihu-zhuanlan/', async ctx => {
  ctx.body = 'Hello'
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(3000)
