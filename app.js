const { stringify } = require('querystring')
const Koa = require('koa')
const KoaRouter = require('koa-router')
const morgan = require('koa-morgan')
const Raven = require('raven')
const fetch = require('node-fetch')
const Feed = require('feed')
const marked = require('marked')

Raven.config(
  'https://1806e37bad074b9386873d165d9f8ce3:5db2f86872464237b1afb55d28810697@sentry.io/220223'
).install()

const app = new Koa()
const router = new KoaRouter()

const PAGE_SIZE = 20 // 20 items for every pull

router.get('/github-issue/:owner/:repo', async ctx => {
  const { owner, repo } = ctx.params
  const query = stringify({
    creator: ctx.query.alluser ? undefined : owner, // Only show issues created by owner by default
    per_page: PAGE_SIZE,
  })
  const api = `https://api.github.com/repos/${owner}/${repo}/issues?${query}`
  const res = await fetch(api)
  const issues = await res.json()

  const feed = new Feed({
    title: `Issues · ${owner}/${repo}`,
    id: `https://github.com/${owner}/${repo}/issues`,
    link: `https://github.com/${owner}/${repo}/issues`,
    author: {
      name: owner,
      link: `https://github.com/${owner}`,
    },
    updated: issues.length ? new Date(issues[0].created_at) : new Date(0),
  })

  issues.forEach(issue => {
    feed.addItem({
      title: issue.title,
      id: issue.html_url,
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

router.get('/zhihu-zhuanlan/:name', async ctx => {
  const { name } = ctx.params
  const api = `https://zhuanlan.zhihu.com/api/columns/${name}/posts?limit=${PAGE_SIZE}`
  const res = await fetch(api)
  const posts = await res.json()

  const feed = new Feed({
    title: `${name} - 知乎专栏`,
    id: `https://zhuanlan.zhihu.com/${name}`,
    link: `https://zhuanlan.zhihu.com/${name}`,
    updated: posts.length ? new Date(posts[0].publishedTime) : new Date(0),
  })

  posts.forEach(post => {
    feed.addItem({
      title: post.title,
      id: `https://zhuanlan.zhihu.com${post.url}`,
      link: `https://zhuanlan.zhihu.com${post.url}`,
      description: post.summary,
      content: post.content,
      author: [
        {
          name: post.author.name,
          link: post.author.profileUrl,
        },
      ],
      date: new Date(post.publishedTime),
      image: post.titleImage,
    })
  })

  ctx.set('Content-Type', 'application/atom+xml')
  ctx.body = feed.atom1()
})

// https://github.com/koajs/koa/wiki/Error-Handling
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.status || 500
    ctx.body = err.message

    // You can get eventId either as the synchronous return value, or via the callback
    Raven.captureException(err, function(sendErr, eventId) {
      // This callback fires once the report has been sent to Sentry
      if (sendErr) {
        console.error('Failed to send captured exception to Sentry')
      } else {
        console.log('Captured exception and send to Sentry successfully')
      }
    })
  }
})

app.use(morgan('combined'))

app.use(router.routes()).use(router.allowedMethods())

app.listen(3000)
