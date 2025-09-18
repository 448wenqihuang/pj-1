// ⚠️ 请替换成你在 Spotify Console 里拿到的临时 Token
const token = "YOUR_SPOTIFY_ACCESS_TOKEN";

// 获取热门新歌
fetch("https://api.spotify.com/v1/browse/new-releases?country=US&limit=10", {
  headers: {
    "Authorization": `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(json => {
    console.log(json); // 可以在控制台里看到返回的完整数据

    let albums = json.albums.items;

    // 按照发布时间从新到旧排序
    let sorted = albums.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));

    sorted.forEach(album => {
      // 创建一个卡片
      let div = document.createElement('div');
      div.classList.add('album');

      div.innerHTML = `
        <img width="150" src="${album.images[0].url}" alt="${album.name}">
        <h4>${album.name}</h4>
        <p>${album.artists.map(a => a.name).join(", ")}</p>
        <p>Release: ${album.release_date}</p>
        <a href="${album.external_urls.spotify}" target="_blank">Listen on Spotify</a>
      `;

      document.querySelector('#songs').appendChild(div);
    });
  })
  .catch(err => console.error("Error fetching Spotify API:", err));
