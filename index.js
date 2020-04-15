const url = require('url')
const path = require('path')
const fs = require('fs')
const request = require('request')
const config = require('./config.json')
const Discord = require('discord.js')

function start() {
    request({
        url: 'https://raw.githubusercontent.com/rocketdv/cart_bot/master/package.json',
        json: true
    }, (err, resp, body) => {
        if (err) {
            return console.log('Error occurred while checking updates: %s', err)
        }
        let curVers = require('./package.json')
        if (curVers.version !== body.version) {
            console.log('Outdated version')
            console.log('UPDATE AVAILABLE: %s', body.update)
        } else {
            console.log('Latest version')
        }
    })

    const bot = new Discord.Client()

    let guild
    let cartNum = 0
    let redeemedTotal = []
    let liveTotal = 0
    let carts = []

    let cartsStore = []

    const {
        server, /* Server/guild ID */
        privateChannel, /* This is a hidden channel, normal members should not be able to see this */
        publicChannel, /* This is a public channel, 'everyone' should be able to see this */
        botToken, /* Bot login token */
        quantityCart, //check if user wants one cart per person
        deleteAfterReact //checks if user wants messages to stay in channel
    } = config

    bot
        .login(botToken)
        .catch(err => console.log('discord loginError: %s', err))




    bot.on('ready', () => {
        console.log(`Logged in as ${bot.user.username}!`)
        guild = bot.guilds.cache.get(server)
        serverName = guild.name
        serverImg = 'https://cdn.discordapp.com/icons/' + guild.id + '/' + guild.icon + '.png'
        console.log(serverImg)
    });

    bot.on('message', msg => {
        try {
            /* if (msg.author.bot) return; */
            if (msg.channel.type === 'dm') return;
            if (msg.channel.id === privateChannel) {
                cartNum += 1
                msg.embeds.forEach(embed => {
                    if (embed.footer) {
                        if (embed.footer.text === 'Wraith by GhostAIO') {
                            let product = embed.fields[0].value
                            let sessionId = embed.fields[2].value
                            let img = embed.thumbnail.url

                            const cartEmbed = new Discord.MessageEmbed()
                                .setColor(0x32a838)
                                .setTitle('Cart Available')
                                .setTimestamp()
                                .addField('Product', product)
                                .setFooter(`Cart: # ${cartNum} • Made by rocket 🚀`, 'https://cdn.discordapp.com/avatars/161556928340688896/05a43644b6dbb7d6b360b8a2bb9281c1.png?size=256')
                            // .setThumbnail(img)
                            carts.push({ embed: cartEmbed })
                            liveTotal = cartNum - redeemedTotal.length
                            writeCart(cartNum, product, sessionId, Date.now())
                        }
                    }
                })
            }
            if (msg.channel.id == publicChannel && msg.embeds.length > 0) {
                msg.react('🛒')
            }
        } catch (err) {
            console.log(err)
        }
    })

    function sendCarts() {
        if (carts.length > 0) {
            console.log('sending cart...')
            guild.channels.cache.get(publicChannel).send(carts.shift())
        }
    }

    // send every 750ms to prevent rate limiting
    setInterval(sendCarts, 750)

    /* FOR 1 CART ONLY */
    redeemed = []
    /* FOR 1 CART ONLY */



    bot.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) { return }
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (e) {
                console.log('Something went wrong when fetching the message: ', e)
                return
            }
        }

        if (!reaction.message.author.bot) { return }
        if (redeemedTotal.includes(reaction.message.id)) { return }

        // /* FOR 1 CART ONLY */
        // let redeemingUser;
        // if ((redeemingUser = redeemed.find(element => element.userid == user.id))) {
        //     if (redeemingUser.quantityCart == quantityCart) {
        //         console.log('user at max carts')
        //         reaction.remove(user)
        //         return
        //     }
        // }
        // /* FOR 1 CART ONLY */



        if (reaction.message.channel.id != publicChannel) { return }
        console.log('Reaction added; current count:', reaction.count);
        if (reaction.count != 2) { return }

        reaction.users.cache.forEach(element => {
            let cartID = reaction.message.embeds[0].footer.text.split('# ')[1].split(' • M')[0]

            for (let cart of cartsStore) {
                if (cart.id != cartID) { continue }
                if (element.bot) { return }
                /* FOR 1 CART ONLY */
                if (quantityCart > 0) {
                    if ((redeemingUser = redeemed.find(element => element.userid == user.id))) {
                        if (redeemingUser.quantityCart < quantityCart) {
                            redeemingUser.quantityCart++
                        }
                    } else {
                        redeemed.push({
                            userid: user.id,
                            name: user.username + '#' + user.discriminator,
                            quantityCart: 1
                        })
                    }
                }

                /* FOR N CART(s) */

                const embed = new Discord.MessageEmbed()
                    .setColor(4200025)
                    .setTimestamp()
                    .setTitle('Here is your cart')
                    .addField('Product', cart.url, false)
                    .addField('Extension Session ID', cart.sessionId, false)
                    .setFooter(`Cart: # ${cart.id} • Made by rocket 🚀`, 'https://cdn.discordapp.com/avatars/161556928340688896/05a43644b6dbb7d6b360b8a2bb9281c1.png?size=256')
                // if (cart.image != '') { embed.setThumbnail(cart.image) }
                if (cart.sku) {
                    embed.addField('SKU', cart.sku, false)
                }

                guild.members.cache.get(element.id).send({ embed })

                redeemedTotal.push(reaction.message.id)

                try {
                    if (deleteAfterReact == false) {
                        reaction.message.edit({
                            embed: {
                                color: 0xf24e4e,
                                title: `Cart Claimed by ${element.username}#${element.discriminator}`,
                                timestamp: new Date(),
                                footer: {
                                    text: reaction.message.embeds[0].footer.text,
                                    icon_url: reaction.message.embeds[0].footer.iconURL
                                }
                            }
                        })
                    }
                } catch (err) {
                    console.log(err)
                }


                liveTotal = cartNum - redeemedTotal.length;
                console.log(`live: ${liveTotal}`);
                console.log(`redeemed: ${redeemedTotal.length}`)
            }
        });
        if (deleteAfterReact) {
            reaction.message.delete()
        }

    });

    function writeCart(cartNum, url, sessionId, time) {
        liveTotal = cartNum - redeemedTotal.length;

        cartsStore.push({
            id: cartNum.toString(),
            url,
            sessionId,
            time
        })
    }
}

start()
