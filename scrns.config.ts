import { Config } from 'scrns'

const config: Config = {
  host: 5180,
  base: '/apvd/',
  output: 'public/img/screenshots',
  selector: '.plot-container',
  screenshots: [
    {
      name: '3-circles',
      url: '#s=YD7n1hxMj7DKNj66',  // 3 circles example
      selector: 'svg.apvd-svg',
    },
    {
      name: 'variant-callers-diamond-best',
      url: '#s=mAsE04S6q5j3Y7jtHu3zAgbHNprpCDl4CSMrPcbxvzbrN',  // 4 ellipses example
      selector: 'svg.apvd-svg',
    },
  ],
}

export default config
