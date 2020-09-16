import { Message, MessageReaction, TextChannel, User } from "discord.js";
import moment from 'moment';

export const notifyMods = async (message: Message, reaction: MessageReaction, targetChannel: TextChannel, reactionTime: moment.Moment): Promise<void> => {
  const likelyUsers = await reaction.users.fetch();
  const likelyUser: User = likelyUsers.first() as User;

  const template = `⚠ At ${moment(message.createdTimestamp, 'x').format('HH:mm')}, ${message.author.toString()} posted the message '${message.content}' to ${message.channel.toString()}.
  \nAt ${reactionTime.format('HH:mm')}, ${likelyUser.toString()} reacted with ${reaction.emoji.name} to indicate the message is problematic.`
  targetChannel.send(template);
};