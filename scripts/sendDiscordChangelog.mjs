// Discord Changelog Webhook Dispatcher
const WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/1565384796052525056/fuXQABnujrCaB_Vz5WKoZSiydNHwWUStVAvM6ZptxnvDf8bHk4RFyZN3gbQzcV6sVmx5';

async function sendChangelog() {
  const now = new Date();
  const dateFormatted = now.toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    dateStyle: 'long',
    timeStyle: 'short'
  });

  const payload = {
    username: 'Peeshtee Update Bot',
    avatar_url: 'https://raw.githubusercontent.com/adoqet/peeshtee/main/public/vite.svg',
    embeds: [
      {
        title: '🚀 Peeshtee v1.14.2 — Güncelleme Notları (Release Changelog)',
        description:
          '**Yeni sürüm başarıyla derlendi ve GitHub main dalına pushlandı!**\nMasadaki fiziksel kart simülasyonları, sosyal panel ve online lobi deneyimi baştan aşağı yenilendi.',
        color: 0xf59e0b, // Amber 500
        fields: [
          {
            name: '🃏 Fiziksel Deste Kesme & Açılış Revizyonu',
            value:
              '• Karıştırma sonrası oluşan çift deste ortadan kaldırıldı; tek ve gerçek deste yuvasından masaya süzülerek açılıyor.\n• Deste kesildiğinde kartlar ikiye bölünerek sol ve sağ yığınlara akıcı biçimde kayıyor.\n• Kesen desteden ortaya 3 kapalı 1 açık kart sırayla uçuyor; açılan Vale havada süzülerek doğrudan kesen oyuncunun envanterine giriyor.\n• Kalan deste diğer destenin üstüne fiziksel olarak konup deste yuvasına yerleşiyor.'
          },
          {
            name: '🎴 Açık Pişti Kartları & Dağınık Toplanan Deste',
            value:
              '• Pişti yapılan kartlar masada artık açık şekilde ve üst üste kademeli olarak sergileniyor (önceki piştiler de alttan görünüyor).\n• Pişti çiftinin diğeri ve toplanan tüm kartlar ters deste gibi masada birikiyor; doğal kahvehane çuha hissi için hafif açılı ve dağınık büyüyor.'
          },
          {
            name: '👥 Sosyal Panel & Arayüz İyileştirmeleri',
            value:
              '• Sosyal panel genişliği %60-70 seviyesine optimize edildi (daha zarif ve kompakt).\n• Sosyal menü açıldığında ana menüdeki içerikler ve butonlar artık sola kaymıyor, sabit kalıyor.\n• "Nasıl Oynanır" butonunun solundaki sosyal butonu kaldırıldı; sadece sağ üst köşede yer alıyor.\n• Arkadaşların profiline bakmak için göz simgesi kaldırıldı; doğrudan avatar veya isme tıklanabiliyor.\n• "Davet Et" butonuna basıldığında alt panel açılmadan doğrudan odaya davet gönderilip lobi açılıyor.'
          },
          {
            name: '📊 Canlı İstatistikler, Unvanlar & Emote Görünürlüğü',
            value:
              '• Arkadaş profillerindeki sabit (7G / 3M) yapay istatistikler kaldırıldı; gerçek kariyer verileri ve maç geçmişi aktarılıyor.\n• Oyun içindeki tüm oyuncuların seçtiği unvanlar ve rozetler doğru şekilde gösteriliyor.\n• Emote reaksiyonları en üst katmana (`z-[100]`) alındı; artık hiçbir çerçevenin arkasında kalmıyor veya kırpılmıyor.'
          },
          {
            name: '🎮 Online Lobi & Terk Etme Puanı',
            value:
              '• Online lobi ekranı yenilendi; oyuncu slotlarında seviye ve unvan bilgileri yer alıyor.\n• Rakip oyunu terk ettiğinde galibiyet ve puan doğru şekilde kariyer istatistiklerine ve maç geçmişine yazılıyor.'
          },
          {
            name: '👨‍💻 Committer / Geliştirici Bilgisi',
            value: `• **GitHub Commit:** \`v1.14.2\`\n• **Geliştirici:** AdoQeT & Arieshev\n• **Tarih & Saat:** ${dateFormatted}`,
            inline: false
          }
        ],
        footer: {
          text: 'Peeshtee: Overdrive • Pişti & RENQ Engine'
        },
        timestamp: now.toISOString()
      }
    ]
  };

  try {
    console.log('Sending changelog to Discord webhook...');
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok || response.status === 204) {
      console.log('✅ Discord changelog successfully sent!');
    } else {
      const errText = await response.text();
      console.error(`❌ Discord webhook error: ${response.status}`, errText);
    }
  } catch (err) {
    console.error('❌ Failed to send Discord webhook:', err);
  }
}

sendChangelog();
