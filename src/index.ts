import dotenv from 'dotenv';
import Discord, { TextChannel, MessageAttachment } from 'discord.js';
import { Clog, LOGLEVEL} from '@fdebijl/clog';
import Twitter, { TwitterOptions,  } from 'twitter-lite'

import { CONFIG } from './config';

dotenv.config();

const clog = new Clog(CONFIG.MIN_LOGLEVEL);
const client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

client.on('ready', () => {
  clog.log('Bot is ready', LOGLEVEL.DEBUG);
});

process.on('unhandledRejection', error => {
	clog.log(`Unhandled promise rejection: ${error}`, LOGLEVEL.ERROR);
});

const config: TwitterOptions = {
  consumer_key: process.env.CONSUMER_KEY as string,
  consumer_secret: process.env.CONSUMER_SECRET as string,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
};

const twitter = new Twitter(config);
const accountsToFollow = process.env.FOLLOWED_ACCOUNTS as string;
const parameters = {
  follow: accountsToFollow
};

const stream = twitter.stream("statuses/filter", parameters)
  .on("start", () => {
    clog.log(`Started listening for tweets from ${accountsToFollow.split(',').length > 1 ? 'accounts' : 'account'}: ${accountsToFollow.split(',').join(', ')}`, LOGLEVEL.DEBUG)
  })
  .on("data", async (tweet: ExtendedTweet)  => {
    clog.log(`New tweet from @${tweet.user.screen_name} with ID ${tweet.id_str}`);
    const targetChannel = await client.channels.resolve(process.env.CHANNEL_ID as string);

    if (!targetChannel) {
      clog.log(`Channel with ID ${process.env.CHANNEL_ID} could not be found`, LOGLEVEL.ERROR);
      return;
    }

    if (!tweet.extended_entities) {
      clog.log(`Tweet doesn't have extended entities, skipping`, LOGLEVEL.DEBUG);
      return;
    }

    if (tweet.extended_entities.media.length === 0) {
      clog.log(`Tweet doesn't have any media inside extended entities, skipping`, LOGLEVEL.DEBUG);
      return;
    }

    tweet.extended_entities.media.forEach((image) => {
      const url = image.media_url_https;
      const attachment = new MessageAttachment(url);
      (targetChannel as TextChannel).send(attachment).catch(error => {
        clog.log(`An error occured while sending an image to a channel: ${error}`);
      })
    });
  })
  .on("ping", () => clog.log("Received ping on stream", LOGLEVEL.DEBUG))
  .on("error", error => console.log("error", error))
  .on("end", response => clog.log(`Stream ended: ${response}`, LOGLEVEL.WARN));

process.on('SIGTERM', () => {
  clog.log(`Received SIGTERM, destroying stream`, LOGLEVEL.INFO);
  process.nextTick(() => stream.destroy());
});