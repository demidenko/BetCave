// ==UserScript==
// @name			pari history saver
// @version		1
// @include		https://pari.ru/account/history/bets
// @require		https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js
// @grant 		GM.setClipboard
// ==/UserScript==


function getStorageValue(suffix) {
  let storage = localStorage
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.endsWith(suffix)) {
      return storage.getItem(key);
    }
  }
  return null;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop().split(';').shift() : null;
}


// Create a helper function that returns a Promise
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function whileNull(fun) {
  while(true) {
    let value = fun();
    if (value) return value;
    await sleep(500);
  }
}

function rndAny(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

$(document).ready(async function() {
  function getFsid() {
    return getCookie('headerApi.FSID') || getStorageValue('.fsid');
  }

  function getClientId() {
    return getCookie('headerApi.cid') || getStorageValue('.clientId');
  }
  
  const sysId = 21;
  
  const fsid = await whileNull(getFsid); //String
  console.log('✅ fsid', '=', fsid);
  
  const clientId = parseInt(await whileNull(getClientId)); //Int
  console.log('✅ clientId', '=', clientId);
  
  
  
  const origin = window.location.origin
  const response = await fetch(`${origin}/urls.json`);
	const config = await response.json();
  const api = rndAny(config.common)
  console.log("api", "=", api)
  
  async function apiPost(path, addBody = { } ) {
    const body = {
      clientId: clientId,
      fsid: fsid,
      sysId: sysId,
      lang: "ru",
      ...addBody
    };
    
    while (true) {
      await sleep(100)
      const response = await fetch(`https:${api}/${path}`, {
        method: "POST",
        headers: {"Content-Type": "text/plain;charset=UTF-8"},
        body: JSON.stringify(body)
      });
      let res = await response.json();
      if (res.result && res.result == "error") {
        console.log(res)
        await sleep(1000)
        continue ;
      }
      return res;
    }
  }
  
  async function getLastCoupons() {
    return await apiPost("betsHistory/getLastCoupons")
  }
  
  async function getPrevCoupons(lastSequenceId) {
    return await apiPost(
      "betsHistory/getPrevCoupons", 
      { lastSequenceId: lastSequenceId }
    )
  }
  
  async function getAllCoupons() {
    let arr = []
    let res = await getLastCoupons()
    while (true) {
      arr = arr.concat(res.coupons)
      if (res.hasMoreData) res = await getPrevCoupons(res.lastSequenceId)
      else break ;
    }
    
    return arr
  }
  
  async function getCouponInfo(couponId) {
    return await apiPost(
      "coupon/info", 
      { betTypeName: "sport", regId: couponId }
    )
  }
  
  async function getAllCouponsInfo(setText) {
    let coupons = await getAllCoupons()
  	console.log(coupons)
    
    const size = coupons.length;
    
    let infos = []
    for (let i=0; i<size; ++i) {
      setText(`${i} / ${size}`);
      const coupon = coupons[i];
      let info = await getCouponInfo(coupon.couponId)
      console.log(coupon.couponId, info.header)
      info.coupon = coupon;
      infos.push(info)
    }
    
    let str = JSON.stringify(infos)
    GM.setClipboard(str);
    setText(`Done!`);
  }
  
  await sleep(2000)
  
  let button = 
      $('<button type="button">Start History Coping</button>')
  		.on('click', async function() {
          let button = $(this)
          button.prop('disabled', true);
          await getAllCouponsInfo(function(text) {
            button.text(text)
          })
    	})

  $('div[class^="history-"] > div[class^="header-"] > div[class^="row-"]')
    .append(button)
});











