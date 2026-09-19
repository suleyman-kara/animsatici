import '../models/catalog_item.dart';

class DefaultCatalog {
  static final List<CatalogCategory> categories = [
    CatalogCategory(id: 'ceng', name: 'CENG & Kodlama', icon: '💻'),
    CatalogCategory(id: 'career', name: 'Şirket & Kariyer', icon: '🏢'),
    CatalogCategory(id: 'campus', name: 'Üniversite & SKS', icon: '🎓'),
    CatalogCategory(id: 'community', name: 'Topluluk & Etkinlik', icon: '🌐'),
  ];

  static final List<CatalogItem> items = [
    CatalogItem(
      id: 'inzva-events',
      title: 'inzva AI & Algoritma Kampları',
      category: 'ceng',
      description: 'Algoritma yarışmaları, yapay zeka kampları ve ileri seviye bilgisayar mühendisliği etkinlikleri.',
      url: 'https://inzva.com/events',
      tags: ['Algoritma', 'AI', 'Yarışma', 'Kamp'],
      badge: 'Önerilen',
      icon: '🧠',
    ),
    CatalogItem(
      id: 'coderspace-hackathons',
      title: 'Coderspace Hackathon & Maratonlar',
      category: 'ceng',
      description: 'Şirketlerin ödüllü hackathonları, kodlama maratonları ve işe alım challenge\'ları.',
      url: 'https://coderspace.io/etkinlikler',
      tags: ['Hackathon', 'İşe Alım', 'Challenge'],
      badge: 'Popüler',
      icon: '🚀',
    ),
    CatalogItem(
      id: 'techcareer-events',
      title: 'Techcareer Bootcamp & Etkinlikler',
      category: 'ceng',
      description: 'Ücretsiz yazılım bootcamp\'leri, webinarlar ve teknoloji yarışmaları.',
      url: 'https://www.techcareer.net/events',
      tags: ['Bootcamp', 'Yazılım', 'Eğitim'],
      badge: 'Aktif',
      icon: '💻',
    ),
    CatalogItem(
      id: 'patika-cohorts',
      title: 'Patika.dev Eğitim ve Staj Cohort\'ları',
      category: 'ceng',
      description: 'Global ve yerli şirketlerin staj ve iş garantili yazılımcı yetiştirme programları.',
      url: 'https://www.patika.dev/bootcamp',
      tags: ['Staj', 'Kariyer', 'Bootcamp'],
      badge: 'Yeni',
      icon: '🛤️',
    ),
    CatalogItem(
      id: 'cu-sks-duyurular',
      title: 'Çukurova Ünv. SKS & Duyurular',
      category: 'campus',
      description: 'Çukurova Üniversitesi Sağlık Kültür ve Spor Daire Başkanlığı burs, yemekhane ve etkinlik duyuruları.',
      url: 'https://sks.cu.edu.tr/cu/duyurular',
      tags: ['Burs', 'Yemekhane', 'Etkinlik', 'Kampüs'],
      badge: 'Kampüs',
      icon: '🎓',
    ),
    CatalogItem(
      id: 'baykar-kariyer',
      title: 'Baykar Kariyer & Staj İlanları',
      category: 'career',
      description: 'Milli Teknoloji Hamlesi staj programları, mezun iş ilanları ve yarışma duyuruları.',
      url: 'https://kariyer.baykartech.com',
      tags: ['Staj', 'Havacılık', 'İş İlanı', 'Savunma'],
      badge: 'Kariyer',
      icon: '✈️',
    ),
    CatalogItem(
      id: 'gdg-turkiye',
      title: 'Google Developer Groups (GDG) Türkiye',
      category: 'community',
      description: 'DevFest, Google I/O Extended ve yerel GDG topluluklarının ücretsiz yazılım zirveleri.',
      url: 'https://gdg.community.dev',
      tags: ['GDG', 'Google', 'DevFest', 'Topluluk'],
      badge: 'Topluluk',
      icon: '🌐',
    ),
  ];

  static Map<String, dynamic> getCatalog({String? category}) {
    List<CatalogItem> filtered = items;
    if (category != null && category != 'all') {
      filtered = items.where((i) => i.category == category).toList();
    }
    return {
      'categories': categories,
      'items': filtered,
    };
  }
}
