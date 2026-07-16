const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify yourself to gain access to the server'),

  async execute(interaction) {
    const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
    const member = interaction.member;

    if (member.roles.cache.has(verifiedRoleId)) {
      return interaction.reply({ content: 'You are already verified.', ephemeral: true });
    }

    try {
      await member.roles.add(verifiedRoleId);
      await interaction.reply({ content: 'You are now verified. Welcome!', ephemeral: true });
    } catch (err) {
      console.error('Verify error:', err);
      await interaction.reply({
        content: 'Something went wrong verifying you. Ping a staff member.',
        ephemeral: true,
      });
    }
  },
};
