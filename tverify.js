const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tverify')
    .setDescription('Request team (TFM) verification — reviewed by owners')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Why you should be verified as team (proof link, context, etc.)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const tfmRoleId = process.env.TFM_ROLE_ID;
    const reviewChannelId = process.env.TEAM_VERIFY_CHANNEL_ID;
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    const member = interaction.member;

    if (member.roles.cache.has(tfmRoleId)) {
      return interaction.reply({ content: 'You already have team verification.', ephemeral: true });
    }

    const reviewChannel = await interaction.client.channels.fetch(reviewChannelId).catch(() => null);
    if (!reviewChannel) {
      return interaction.reply({
        content: 'Team verification is unavailable right now — contact an owner directly.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Team Verification Request')
      .setColor(0xf1c40f)
      .addFields(
        { name: 'User', value: `<@${member.id}> (${member.user.tag})`, inline: false },
        { name: 'Reason / Proof', value: reason, inline: false }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tverify_approve_${member.id}`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`tverify_deny_${member.id}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
    );

    await reviewChannel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: 'Your team verification request has been sent to the owners for review.',
      ephemeral: true,
    });
  },
};
