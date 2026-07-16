require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const payload = { content: 'There was an error running that command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
    return;
  }

  // Approve/deny buttons on /tverify requests
  if (interaction.isButton()) {
    const [action, decision, userId] = interaction.customId.split('_');
    if (action !== 'tverify') return;

    const ownerRoleId = process.env.OWNER_ROLE_ID;
    if (!interaction.member.roles.cache.has(ownerRoleId) &&
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Only owners can approve or deny this.', ephemeral: true });
    }

    const guild = interaction.guild;
    const targetMember = await guild.members.fetch(userId).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ content: 'That member is no longer in the server.', ephemeral: true });
    }

    const tfmRoleId = process.env.TFM_ROLE_ID;
    const auditChannelId = process.env.AUDIT_LOG_CHANNEL_ID;

    if (decision === 'approve') {
      await targetMember.roles.add(tfmRoleId).catch(console.error);

      // Prefix their display name with [TFM] since Discord roles can't do this natively
      const currentName = targetMember.nickname || targetMember.user.username;
      if (!currentName.startsWith('[TFM]')) {
        const newName = `[TFM] ${currentName}`.slice(0, 32); // Discord nickname limit
        await targetMember.setNickname(newName).catch(err =>
          console.error('Could not set nickname (bot role may be below member in hierarchy):', err)
        );
      }

      await targetMember.send('Your team verification was approved. Welcome to the team!').catch(() => {});
    } else if (decision === 'deny') {
      await targetMember.send('Your team verification request was denied.').catch(() => {});
    }

    const decidedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(decision === 'approve' ? 0x2ecc71 : 0xe74c3c)
      .setFooter({ text: `${decision === 'approve' ? 'Approved' : 'Denied'} by ${interaction.user.tag}` });

    await interaction.update({ embeds: [decidedEmbed], components: [] });

    if (auditChannelId) {
      const auditChannel = await guild.channels.fetch(auditChannelId).catch(() => null);
      if (auditChannel) {
        auditChannel.send(
          `**${decision === 'approve' ? 'Approved' : 'Denied'}** — <@${userId}> by <@${interaction.user.id}>`
        );
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
