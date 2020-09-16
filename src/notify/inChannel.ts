import { Message } from "discord.js"

export const notifyInChannel = (message: Message): void => {
  const template = process.env.IN_CHANNEL_TEMPLATE
    ?.replace('%%TAG%%', message.author.toString())
    ?.replace('%%MESSAGE%%', message.content)

  message.channel.send(template);
};