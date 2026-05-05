// ローカルストレージをクリア
localStorage.removeItem('pharmacy-calendar-data');

// サーバーのデータもクリア
fetch('http://localhost:3001/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({}),
})
.then(() => {
  console.log('データをクリアしました。ページをリロードしてください。');
  location.reload();
})
.catch((error) => {
  console.log('ローカルストレージのみクリアしました。ページをリロードしてください。');
  location.reload();
});
