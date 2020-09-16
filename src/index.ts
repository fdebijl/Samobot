import dotenv from 'dotenv';
import Discord, { TextChannel, Message, SystemChannelFlags, MessageAttachment } from 'discord.js';
import moment from 'moment';
import { Clog, LOGLEVEL} from '@fdebijl/clog';
import Twitter, { TwitterOptions,  } from 'twitter-lite'

import { CONFIG } from './config';
import { notifyInChannel } from './notify/inChannel';
import { notifyMods } from './notify/mods';

dotenv.config();

const clog = new Clog(CONFIG.MIN_LOGLEVEL);
const client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

client.on('ready', () => {
  clog.log('Bot is ready', LOGLEVEL.DEBUG);
});

const config: TwitterOptions = {
  consumer_key: 'XYZ',
  consumer_secret: 'XYZ',
  access_token_key: 'XYZ',
  access_token_secret: 'XYZ'
};

const twitter = new Twitter(config);

const accountsToFollow = ['957585893912731600', '33972891']
const parameters = {
  follow: accountsToFollow.join(',')
};
const stream = twitter.stream("statuses/filter", parameters)
  .on("start", () => {
    clog.log(`Started listening for tweets from account(s): ${accountsToFollow.join(', ')}`, LOGLEVEL.DEBUG)
  })
  .on("data", async tweet => {
    clog.log(`New tweet from @${tweet.user.screen_name} with ID ${tweet.id_str}`);
    const targetChannel = await client.channels.resolve(process.env.CHANNEL_ID as string);

    if (!targetChannel) {
      clog.log(`Channel with ID ${process.env.CHANNEL_ID} could not be found`, LOGLEVEL.ERROR);
      return;
    }

    if (tweet?.extended_entities?.media?.length === 0) {
      return;
    }

    tweet.extended_entities.media.forEach((image) => {
      const url = image.media_url_https;
      const attachment = new MessageAttachment(url);
      (targetChannel as TextChannel).send(attachment);
    });
  })
  //.on("ping", () => console.log("ping"))
  .on("error", error => console.log("error", error))
  //.on("end", response => console.log("end"));
