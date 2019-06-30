function myFunction() {
  // 何日まえにリマインドするかここで入力
  var when_to_remind = 3;
  var today = new Date().toLocaleDateString();

  var env_vars = ["URL", "ID", "ID_sel", "PASS", "PASS_sel", "Selector"];
  var conf = {}

  for (var i = 0, l=env_vars.length; i < l; i++) {
    conf[env_vars[i]] = PropertiesService.getScriptProperties().getProperty(env_vars[i].toUpperCase());
  }
  // POSTデータ
  var payload = {
    userno : conf.ID,
    passwd : conf.PASS,
  }
  // POSTオプション
  var options = {
    "method" : "POST",
    "payload" : payload,
    "followRedirects" : false
  }

// ログインページをフェッチ
  var response = UrlFetchApp.fetch((conf.URL), options);

  // レスポンスヘッダーからcookieを取得
 var cookies = response.getHeaders()["Set-Cookie"];

 // ログインで認証されたcookieはヘッダーで使用
 var headers = response.getAllHeaders();
 var cookies = [];
 if ( typeof headers['Set-Cookie'] !== 'undefined' ) {
   // Set-Cookieヘッダーが2つ以上の場合はheaders['Set-Cookie']の中身は配列
   var cookies = typeof headers['Set-Cookie'] == 'string' ? [ headers['Set-Cookie'] ] : headers['Set-Cookie'];
   for (var i = 0; i < cookies.length; i++) {
     // Set-Cookieヘッダーからname=valueだけ取り出し、セミコロン以降の属性は除外する
     cookies[i] = cookies[i].split( ';' )[0];
   };
 }
 options = {
   method: "get",
   followRedirects: false,
   headers: {
     Cookie: cookies.join(';')
   }
 };
 var target_URL = PropertiesService.getScriptProperties().getProperty("target_URL");
 // 貸出期限の載ったページをフェッチ
 response = UrlFetchApp.fetch((target_URL), options).getContentText();

  var bookTitleRegex = new RegExp(/<strong>(.+)<\/strong><\/a><br>(.+)/g);
  var dateRegex = new RegExp(/<td class="nwrap">(.+)<\/td>/g);


  var book_titles = response.match(bookTitleRegex);
  var return_dates = response.match(dateRegex);

// 借りてる本がなければ終了
  if (book_titles == undefined) {
    Logger.log(book_titles);
    return;
  }

  for (var i_date = 0, i_title = 0, l = return_dates.length; i_date < l; i_date += 2, i_title++) {
    return_dates[i_date] = book_titles[i_title];
  }

  var items = [];
  var item = return_dates;

  for (var i = 0; i < item.length; i++) {
    var content = item[i]
    .replace("<td class=\"nwrap\">", "").replace("</td>", "").replace("<strong>", "").replace("</strong></a><br>", " ");
    if (i % 2 != 0) {
      date_to_return = new Date(content);
      date_to_return.setDate(date_to_return.getDate() - when_to_remind);
      var date_to_alert = date_to_return.toLocaleDateString();

      if (today != date_to_alert) {
        items.pop();
        continue;
      }
      continue;
    }
    items.push("・ " + [content]);
  }

  Logger.log(items);
  if (items.length > 0) {
    postSlack(items.length.toString() + "冊の本の締め切りが" + when_to_remind.toString() + "日後になりました。\\n\\n" + items.toString().replace(/,/g, "\n"));
  }

}

// Slackへポストする関数
function postSlack(text){
  var slack_post_url = PropertiesService.getScriptProperties().getProperty("slack_post_url");
  var options = {
    "method" : "POST",
    "headers": {"Content-type": "application/json"},
    "payload" : '{"text":"' + text + '"}'
  };
  UrlFetchApp.fetch(slack_post_url, options);
}
