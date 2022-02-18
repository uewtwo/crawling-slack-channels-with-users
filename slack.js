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
    res.channels.forEach(c => {
        channels.push(
            {
                channel_name: c.name,
                channel_id: c.id,
                channel_topic: c.topic.value,
                channel_purpose: c.purpose.value,
                channel_creator_id: c.creator
            }
        )
    })

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
        // channel creator を member_list から探す]
        const creator_id = c.channel_creator_id
        let creatorInfo
        let creatorName
        try {
            creatorInfo = members[creator_id]
            creatorName = creatorInfo.user_name
        } catch (e) {
            creatorInfo = await getMemberInfo(creator_id)
            creatorName = creatorInfo.user.name
            console.log(creatorInfo)
        }

        // channels in membersに対して一人ずつ member_list と照合する
        for (let i = 0; i < member_list.length; i++) {
            const m = member_list[i]
            // membersにmember_listのidがあるか確認、なければ直接member_infoを取得
            let deleted
            let user_name
            let stranger
            if (members[m] != undefined) {
                deleted = members[m].deleted
                user_name = members[m].user_name
                stranger = false
            } else {
                const memberInfo = await getMemberInfo(m)
                deleted = null
                user_name = memberInfo.user.name
                stranger = memberInfo.user.is_stranger
            }
            membersInChannel.push({
                channel_name: c.channel_name,
                channel_topic: c.channel_topic,
                channel_purpose: c.channel_purpose,
                channel_creator: creatorName,
                channel_creator_info: creatorInfo,
                user_name: user_name,
                deleted: deleted,
                stranger: stranger,
                user_id: m
            })
        }
    }))

    return membersInChannel
}

conversationsMemberJson()
    .then(res => {
        const csvFields = ["channel_name", "channel_topic", "channel_purpose", "channel_creator", "channel_creator_info", "user_name", "deleted", "stranger", "user_id"]
        const json2csvParser = new Json2csvParser({ fields: csvFields, header: true})
        const csv = json2csvParser.parse(res)
        const output = fs.createWriteStream("./slack-conversations-member.csv", { encoding: 'utf-8'})
        output.write(csv)
    })
