import dotenv from 'dotenv';
import Discord, { TextChannel, MessageAttachment } from 'discord.js';
import { Clog, LOGLEVEL} from '@fdebijl/clog';
import Twitter, { Stream, TwitterOptions,  } from 'twitter-lite'

import { CONFIG } from './config';

dotenv.config();

const clog = new Clog(CONFIG.MIN_LOGLEVEL);

const config: TwitterOptions = {
  consumer_key: process.env.CONSUMER_KEY as string,
  consumer_secret: process.env.CONSUMER_SECRET as string,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
};

const twitter = new Twitter(config);
const accountsToFollow = process.env.FOLLOWED_ACCOUNTS as string;
const accountsToPost = accountsToFollow.split(',');
const parameters = {
  follow: accountsToFollow.replace(/\s/g, '')
};

let stream: Stream;

const startStream = (): void => {
  stream = twitter.stream("statuses/filter", parameters)
  .on("start", () => {
    clog.log(`Started listening for tweets from ${accountsToFollow.split(',').length > 1 ? 'accounts' : 'account'}: ${accountsToFollow.split(',').join(', ')}`, LOGLEVEL.DEBUG)
  })
  .on("data", async (tweet: ExtendedTweet)  => {
    if (!accountsToPost.includes(tweet.user.id_str)) {
      // Reply to an account we're following
      return;
    }

    if (tweet.retweeted_status) {
      // Ignore retweets
      return;
    }

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

    tweet.extended_entities.media.forEach((media) => {
      let url = '';

      if (media.type === 'video') {
        const bestVariant: any = (media as any).video_info.variants.filter((variant: any) => {
          return !!variant.bitrate;
        }).sort((a: {bitrate: number}, b: {bitrate: number}) => {
          return b.bitrate - a.bitrate;
        });

        url = bestVariant[0].url;
      } else {
        url = media.media_url_https;
      }

      const attachment = new MessageAttachment(url);
      (targetChannel as TextChannel).send(attachment).catch(error => {
        clog.log(`An error occured while sending an image to a channel: ${error}`);
      })
    });
  })
  .on("error", error => clog.log(error, LOGLEVEL.ERROR))
  .on("end", (reason) => {
    clog.log(`Stream ended, restarting in 60 seconds`, LOGLEVEL.INFO);
    process.nextTick(() => stream.destroy());

    setTimeout(() => {
      startStream();
    }, 60 * 1000)
  });
}

process.on('SIGTERM', () => {
  clog.log(`Received SIGTERM, destroying stream`, LOGLEVEL.INFO);

  if (stream) {
    process.nextTick(() => stream.destroy());
  }
});

const client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

client.on('ready', () => {
  clog.log('Bot is ready', LOGLEVEL.DEBUG);
  startStream();
});
