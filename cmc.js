const axios = require('axios')
const fs = require('fs');

// coinmarketcap 获取数据map
async function url_cmc_handle() {
    const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map';
    const CMC_PRO_API_KEY = '871f020c-7193-46ff-9dc1-22d2fc0f8aaa';
    const lastCmcMap = [];
    const limit = 5000;

    for (let index = 1; index < 3; index++) {
        const result = await axios(url, {
            // 必须指定 method
            method: 'GET',
            // 通过 contentType 告诉 HttpClient 以 JSON 格式发送
            // contentType: 'json',
            // 自动解析 JSON response
            dataType: 'json',
            // header
            headers: {
                'X-CMC_PRO_API_KEY': CMC_PRO_API_KEY,
            },
            // 参数
            data: {
                start: limit * (index - 1) + 1,
                limit,
                sort: 'id',
            },
            // 6 秒超时
            timeout: 6000,
        });

        const resData = result.data.data;
        if (resData.length !== 0) {
            for (const info of resData) {
                lastCmcMap.push(info);
            }
        }

        
    }

    return lastCmcMap;
}

// 获取 heco 的币种
async function url_token(chain_id = '128') {
    const url = 'https://gateway.mdex.cc/v2/token/price';
    // const last = [];
    const result = await axios(url, {
        // 必须指定 method
        method: 'GET',
        // 通过 contentType 告诉 HttpClient 以 JSON 格式发送
        // contentType: 'json',
        // 自动解析 JSON response
        dataType: 'json',
        // 参数
        data: {
            mdex_chainid: chain_id,
        },
        // 6 秒超时
        timeout: 6000,
    });

    const resData = result.data.result;

    // Object.keys(resData).forEach(key => {
    //     last.push(key.toLowerCase());
    // });

    console.log(`获取币种信息 [chain_id:${chain_id}]`);
    return resData;
}


// subscribe 是真正定时任务执行时被运行的函数
async function subscribe() {

    // init
    const lastCmcMap = {};

    // 获取token
    const token_heco = await url_token('128');
    const token_bsc = await url_token('56');
    const token_info_list = Object.assign(token_heco, token_bsc);

    // 获取数据map
    const mapList = await url_cmc_handle();
    const cmcFileData = JSON.parse(fs.readFileSync('./cmc.json', 'utf-8'))
    // 过滤数据
    for (const info of mapList) {
        if (info.platform && info.platform.token_address.toLowerCase().includes('0x') && token_info_list[info.platform.token_address.toLowerCase()]) {
            if(!cmcFileData[info.platform.token_address.toLowerCase()]) {
                lastCmcMap[info.platform.token_address.toLowerCase()] = info.slug
            }
            // 清理当前token
            // const index = token_list.indexOf(info.platform.token_address.toLowerCase());
            // token_list.splice(index, index + 1);
            delete token_info_list[info.platform.token_address.toLowerCase()];
        }
    }
    const mergeData = Object.assign(cmcFileData, lastCmcMap)
    fs.writeFile(`./cmc.json`, JSON.stringify(mergeData), err => {
        if (err) {
            console.log('ERROR', err);
        }
        console.log('JSON data is saved.');
    });
    console.log('======== 同步coinmarketcap数据 [cron-cmc] [end]  ========');
}

subscribe()