import dotenv from 'dotenv';
import Discord, { TextChannel, Message } from 'discord.js';
import moment from 'moment';
import { Clog, LOGLEVEL} from '@fdebijl/clog';

import { CONFIG } from './config';
import { notifyInChannel } from './notify/inChannel';
import { notifyMods } from './notify/mods';

dotenv.config();

const clog = new Clog(CONFIG.MIN_LOGLEVEL);
const client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

client.on('ready', () => {
  clog.log('Bot is ready', LOGLEVEL.DEBUG);
})

client.on('messageReactionAdd', async reaction => {
  try {
    if (reaction.emoji.name === '⛔' && reaction.count === 1 && !reaction.message.author.bot) {
      notifyInChannel(reaction.message);

      if (process.env.MOD_CHANNEL_ID) {
        const channel = await client.channels.resolve(process.env.MOD_CHANNEL_ID as string);
        notifyMods(reaction.message, reaction, channel as TextChannel, moment())
      }
    }
  } catch (error) {
    clog.log(error, LOGLEVEL.ERROR);
  }
});
