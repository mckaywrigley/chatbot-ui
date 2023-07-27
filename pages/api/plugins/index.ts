import weather from "./weather"
import news from "./news"
import { NextApiRequest, NextApiResponse } from 'next';

export const plugins = [
  weather, news
]


export default (req: NextApiRequest, res: NextApiResponse) => {
  res.json(plugins.map(plugin => ({
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    parameters: plugin.parameters
  })));
}