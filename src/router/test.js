
import index from '@/view/test'
import hello from '@/view/test/hello'
import ringPic from '@/view/test/ringPic'

export default [
  {
    path: '',
    redirect: '/test'
  },
  {
    path: '/test',
    component: index,
    // meta: { requiresAuth: true },
    children: []
  },
  {
    path: '/test/hello',
    component: hello,
  },
  {
    path: '/test/ringPic',
    component: ringPic,
  }
]
