const { Discord, Client, MessageEmbed } = require('discord.js');
const client = global.client = new Client({fetchAllMembers: true});
const ayarlar = require('./ayarlar.json');
const fs = require('fs');

client.on("ready", async () => {
  client.user.setPresence({ activity: { name: "shina 💚 White" }, status: "online" });
  let botVoiceChannel = client.channels.cache.get(ayarlar.botVoiceChannelID);
  if (botVoiceChannel) botVoiceChannel.join().catch(err => console.error("Bot ses kanalına bağlanamadı!"));
});


client.on("message", async message => {
  if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith(ayarlar.botPrefix)) return;
  if (message.author.id !== ayarlar.botOwner && message.author.id !== message.guild.owner.id) return;
  let args = message.content.split(' ').slice(1);
  let command = message.content.split(' ')[0].slice(ayarlar.botPrefix.length);
  let embed = new MessageEmbed().setColor("RANDOM").setAuthor(message.member.displayName, message.author.avatarURL({ dynamic: true, })).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp();
  

  if (command === "eval" && message.author.id === ayarlar.botOwner) {
    if (!args[0]) return message.channel.send(`Kod belirtilmedi`);
      let code = args.join(' ');
      function clean(text) {
      if (typeof text !== 'string') text = require('util').inspect(text, { depth: 0 })
      text = text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203))
      return text;
    };
    try { 
      var evaled = clean(await eval(code));
      if(evaled.match(new RegExp(`${client.token}`, 'g'))) evaled.replace(client.token, "Yasaklı komut");
      message.channel.send(`${evaled.replace(client.token, "Yasaklı komut")}`, {code: "js", split: true});
    } catch(err) { message.channel.send(err, {code: "js", split: true}) };
  };

  if(command === "güvenli") {
    let hedef;
    let rol = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name === args.join(" "));
    let uye = message.mentions.users.first() || message.guild.members.cache.get(args[0]);
    if (rol) hedef = rol;
    if (uye) hedef = uye;
    let guvenliler = ayarlar.whitelist || [];
    if (!hedef) return message.channel.send(embed.setDescription(`Güvenli listeye eklemek/kaldırmak için bir hedef (rol/üye) belirtmelisin!`).addField("Güvenli Liste", guvenliler.length > 0 ? guvenliler.map(g => (message.guild.roles.cache.has(g.slice(1)) || message.guild.members.cache.has(g.slice(1))) ? (message.guild.roles.cache.get(g.slice(1)) || message.guild.members.cache.get(g.slice(1))) : g).join('\n') : "Bulunamadı!"));
    if (guvenliler.some(g => g.includes(hedef.id))) {
      guvenliler = guvenliler.filter(g => !g.includes(hedef.id));
      ayarlar.whitelist = guvenliler;
      fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
        if (err) console.log(err);
      });
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} tarafından güvenli listeden kaldırıldı!`));
    } else {
      ayarlar.whitelist.push(`y${hedef.id}`);
      fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
        if (err) console.log(err);
      });
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} tarafından güvenli listeye eklendi!`));
    };
  };

  if(command === "ayar")  {
    let korumalar = Object.keys(ayarlar).filter(k => k.includes('Guard'));
    if (!args[0] || !korumalar.some(k => k.includes(args[0]))) return message.channel.send(embed.setDescription(`Korumaları aktif etmek veya devre dışı bırakmak için **${ayarlar.botPrefix}ayar <koruma>** yazmanız yeterlidir! **Korumalar:** ${korumalar.map(k => `\`${k}\``).join(', ')}\n**Aktif Korumalar:** ${korumalar.filter(k => ayarlar[k]).map(k => `\`${k}\``).join(', ')}`));
    let koruma = korumalar.find(k => k.includes(args[0]));
    ayarlar[koruma] = !ayarlar[koruma];
    fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
      if (err) console.log(err);
    });
    message.channel.send(embed.setDescription(`**${koruma}** koruması, ${message.author} tarafından ${ayarlar[koruma] ? "aktif edildi" : "devre dışı bırakıldı"}!`));
  };
});


function guvenli(kisiID) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  let guvenliler = ayarlar.whitelist || [];
  if (!uye || uye.id === client.user.id || uye.id === ayarlar.botOwner || uye.id === uye.guild.owner.id || guvenliler.some(g => uye.id === g.slice(1) || uye.roles.cache.has(g.slice(1)))) return true
  else return false;
};

const yetkiPermleri = ["ADMINISTRATOR", "MANAGE_ROLES", "MANAGE_CHANNELS", "MANAGE_GUILD", "BAN_MEMBERS", "KICK_MEMBERS", "MANAGE_NICKNAMES", "MANAGE_EMOJIS", "MANAGE_WEBHOOKS"];
function cezalandir(kisiID, tur) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  if (!uye) return;
  if (tur == "jail") return uye.roles.cache.has(ayarlar.boosterRole) ? uye.roles.set([ayarlar.boosterRole, ayarlar.jailRole]) : uye.roles.set([ayarlar.jailRole]);
  if (tur == "ban") return uye.ban({ reason: "shina Guard" }).catch();
};


client.on("guildMemberRemove", async member => {
  let entry = await member.guild.fetchAuditLogs({type: 'MEMBER_KICK'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.kickGuard) return;
  cezalandir(entry.executor.id, "ban");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Sağ Tık Kick Atıldı!').setDescription(`${member} **(${member.id})** üyesi, ${entry.executor} **(${entry.executor.id})** tarafından sunucudan sağ tık ile kicklendi! Kickleyen kişi jaile atıldı.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { member.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Sağ Tık Kick Atıldı!').setDescription(`${member} **(${member.id})** üyesi, ${entry.executor} (${entry.executor.id}) tarafından sunucudan sağ tık ile kicklendi! Kickleyen kişi jaile atıldı.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
});

client.on("guildBanAdd", async (guild, user) => {
  let entry = await guild.fetchAuditLogs({type: 'MEMBER_BAN_ADD'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || guvenli(entry.executor.id) || !ayarlar.banGuard) return;
   cezalandir(entry.executor.id, "ban");
  guild.members.unban(user.id, "Sağ Tık İle Banlandığı İçin Geri Açıldı!").catch(console.error);
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Sağ Tık Ban Atıldı!').setDescription(`${user} **(${user.id})** üyesi, ${entry.executor} **(${entry.executor.id})** tarafından sunucudan sağ tık ile banlandı! Banlayan kişi jaile atıldı.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Sağ Tık Ban Atıldı!').setDescription(`${user} **(${user.id})** üyesi, ${entry.executor} **(${entry.executor.id})** tarafından sunucudan sağ tık ile banlandı! Banlayan kişi jaile atıldı.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
});

client.on("guildMemberAdd", async member => {
  let entry = await member.guild.fetchAuditLogs({type: 'BOT_ADD'}).then(audit => audit.entries.first());
  if (!member.user.bot || !entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.botGuard) return;
  cezalandir(entry.executor.id, "ban");
  cezalandir(member.id, "ban");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Sunucuya Bot Eklendi!').setDescription(`${member} **(${member.id})** botu, ${entry.executor} **(${entry.executor.id})** tarafından sunucuya eklendi! Ekleyen kişi ve bot banlandı.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { member.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Sunucuya Bot Eklendi!').setDescription(`${member} **(${member.id})** botu, ${entry.executor} **(${entry.executor.id})** tarafından sunucuya eklendi! Ekleyen kişi ve bot banlandı.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
});

client.on("guildUpdate", async (oldGuild, newGuild) => {
  let entry = await newGuild.fetchAuditLogs({type: 'GUILD_UPDATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.serverGuard) return;
  cezalandir(entry.executor.id, "ban");
  if (newGuild.name !== oldGuild.name) newGuild.setName(oldGuild.name);
  if (newGuild.iconURL({dynamic: true, size: 2048}) !== oldGuild.iconURL({dynamic: true, size: 2048})) newGuild.setIcon(oldGuild.iconURL({dynamic: true, size: 2048}));
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Sunucu Güncellendi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından sunucu güncellendi! Güncelleyen kişi banlandı ve sunucu eski haline getirildi.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { newGuild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Sunucu Güncellendi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından sunucudan sunucu güncellendi! Güncelleyen kişi banlandı ve sunucu eski haline getirildi.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
});

client.on("channelCreate", async channel => {
  let entry = await channel.guild.fetchAuditLogs({type: 'CHANNEL_CREATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.channelGuard) return;
  channel.delete({reason: "shina Kanal Koruma"});
  cezalandir(entry.executor.id, "jail");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Kanal Oluşturuldu!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından kanal oluşturuldu! Oluşturan kişi jaile atıldı ve kanal silindi.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { channel.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Kanal Oluşturuldu!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından kanal oluşturuldu! Oluşturan kişi jaile atıldı ve kanal silindi.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
});

client.on("channelUpdate", async (oldChannel, newChannel) => {
  let entry = await newChannel.guild.fetchAuditLogs({type: 'CHANNEL_UPDATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || !newChannel.guild.channels.cache.has(newChannel.id) || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.channelGuard) return;
  cezalandir(entry.executor.id, "jail");
  if (newChannel.type !== "category" && newChannel.parentID !== oldChannel.parentID) newChannel.setParent(oldChannel.parentID);
  if (newChannel.type === "category") {
    newChannel.edit({
      name: oldChannel.name,
    });
  } else if (newChannel.type === "text") {
    newChannel.edit({
      name: oldChannel.name,
      topic: oldChannel.topic,
      nsfw: oldChannel.nsfw,
      rateLimitPerUser: oldChannel.rateLimitPerUser
    });
  } else if (newChannel.type === "voice") {
    newChannel.edit({
      name: oldChannel.name,
      bitrate: oldChannel.bitrate,
      userLimit: oldChannel.userLimit,
    });
  };
  oldChannel.permissionOverwrites.forEach(perm => {
    let thisPermOverwrites = {};
    perm.allow.toArray().forEach(p => {
      thisPermOverwrites[p] = true;
    });
    perm.deny.toArray().forEach(p => {
      thisPermOverwrites[p] = false;
    });
    newChannel.createOverwrite(perm.id, thisPermOverwrites);
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Kanal Güncellendi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından **${oldChannel.name}** kanalı güncellendi! Güncelleyen kişi jaile atıldı ve kanal eski haline getirildi.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { newChannel.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Kanal Güncellendi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından **${oldChannel.name}** kanalı güncellendi! Güncelleyen kişi jaile atıldı ve kanal eski haline getirildi.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
});

client.on("channelDelete", async channel => {
  let entry = await channel.guild.fetchAuditLogs({type: 'CHANNEL_DELETE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.channelGuard) return;
  cezalandir(entry.executor.id, "jail");
  await channel.clone({ reason: "shina Kanal Koruma" }).then(async kanal => {
    if (channel.parentID != null) await kanal.setParent(channel.parentID);
    await kanal.setPosition(channel.position);
    if (channel.type == "category") await channel.guild.channels.cache.filter(k => k.parentID == channel.id).forEach(x => x.setParent(kanal.id));
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Kanal Silindi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından **${channel.name}** kanalı silindi! Silen kişi jaile atıldı ve kanal tekrar açıldı.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { channel.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Kanal Silindi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından **${channel.name}** kanalı silindi! Silen kişi jaile atıldı ve kanal tekrar açıldı.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
});

function ytKapat(guildID) {
  let sunucu = client.guilds.cache.get(guildID);
  if (!sunucu) return;
  sunucu.roles.cache.filter(r => r.editable && (r.permissions.has("ADMINISTRATOR") || r.permissions.has("MANAGE_GUILD") || r.permissions.has("MANAGE_ROLES") || r.permissions.has("MANAGE_WEBHOOKS"))).forEach(async r => {
    await r.setPermissions(0);
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('İzinler Kapatıldı!').setDescription(`Rollerin yetkileri kapatıldı!`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { client.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('İzinler Kapatıldı!').setDescription(`Rollerin yetkileri kapatıldı!`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
};
client.login(process.env.token).then(c => console.log(`${client.user.tag} olarak giriş yapıldı!`)).catch(err => console.error("Bota giriş yapılırken başarısız olundu!"));
