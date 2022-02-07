const { WebClient } = require('@slack/web-api')
const Json2csvParser = require('json2csv').Parser
const fs = require('fs')

require('dotenv').config()


const TOKEN = process.env.TOKEN
const web = new WebClient(TOKEN)

// Slack api optional limit
const GET_LIMIT = 100000

// Get channel list
async function getChannels() {
    const param = {
        exclude_archived: true,
        limit: GET_LIMIT,
    }

    const res = await web.conversations.list(param)
    // Need channel name
    let channels = []
    res.channels.forEach(c =>
        channels.push(
            {
                channel_name: c.name,
                channel_id: c.id
            }))

    return channels
}

async function getMembers() {
    const param = {
        limit: GET_LIMIT,
    }

    const res = await web.users.list(param)
    // exclude deleted user
    let users = []
    res.members.forEach(m => {
        users[m.id] = {
            user_name: m.real_name,
            deleted: m.deleted
        }
    })

    return users
}

async function getMembersInChannel(channel_id) {
    const param = {
        channel: channel_id,
        limit: GET_LIMIT,
    }

    const res = await web.conversations.members(param)

    return res.members
}

async function getMemberInfo(user_id) {
    const param = {
        user: user_id
    }

    const res = await web.users.info(param)

    return res
}

const conversationsMemberJson = async () => {
    const channels = await getChannels()
    const members = await getMembers()
    let membersInChannel = []

    await Promise.all(channels.map(async (c) => {
        const member_list = await getMembersInChannel(c.channel_id)
        for (let i = 0; i < member_list.length; i++) {
            const m = member_list[i]
            if (members[m] != undefined) {
                membersInChannel.push({
                    channel_name: c.channel_name,
                    user_name: members[m].user_name,
                    deleted: members[m].deleted,
                    stranger: false,
                    user_id: m
                })
            } else {
                const m = member_list[i]
                const memberInfo = await getMemberInfo(m)
                membersInChannel.push({
                    channel_name: c.channel_name,
                    user_name: memberInfo.user.name,
                    deleted: null,
                    stranger: memberInfo.user.is_stranger,
                    user_id: m
                })
            }
        }
    }))

    return membersInChannel
}

conversationsMemberJson()
    .then(res => {
        const csvFields = ["channel_name", "user_name", "deleted", "stranger", "user_id"]
        const json2csvParser = new Json2csvParser({ fields: csvFields, header: true})
        const csv = json2csvParser.parse(res)
        const output = fs.createWriteStream("./slack-conversations-member.csv", { encoding: 'utf-8'})
        output.write(csv)
    })
