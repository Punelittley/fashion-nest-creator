import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Не найдены переменные окружения VITE_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
  console.log('Создайте файл .env.local с этими переменными');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Читаем init-db.sql
const sqlPath = path.join(__dirname, '..', 'server', 'init-db.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

// Парсим категории из SQL
function parseCategories(sql) {
  const categoryRegex = /INSERT OR IGNORE INTO categories[^V]+VALUES\s+([\s\S]+?);/i;
  const match = sql.match(categoryRegex);
  if (!match) return [];

  const categories = [];
  const valueRegex = /\('([^']+)',\s*'([^']+)',\s*'([^']*)'\)/g;
  let valueMatch;

  while ((valueMatch = valueRegex.exec(match[1])) !== null) {
    categories.push({
      id: valueMatch[1],
      name: valueMatch[2],
      description: valueMatch[3] || null
    });
  }

  return categories;
}

// Парсим продукты из SQL
function parseProducts(sql) {
  const productRegex = /-- Верхняя одежда[\s\S]+?-- Обувь[\s\S]+?;/;
  const match = sql.match(productRegex);
  if (!match) return [];

  const products = [];
  const valueRegex = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)',\s*([0-9.]+),\s*'([^']*)',\s*(\d+),\s*(\d+)\)/g;
  let valueMatch;

  while ((valueMatch = valueRegex.exec(match[0])) !== null) {
    products.push({
      sqlite_id: valueMatch[1],
      category_sqlite_id: valueMatch[2],
      name: valueMatch[3],
      description: valueMatch[4] || null,
      price: parseFloat(valueMatch[5]),
      image_url: valueMatch[6] || null,
      stock: parseInt(valueMatch[7]),
      is_active: valueMatch[8] === '1'
    });
  }

  return products;
}

// Маппинг SQLite ID -> Supabase UUID
const categoryMapping = {
  'cat-001': null,
  'cat-002': null,
  'cat-003': null,
  'cat-004': null
};

const productMapping = {
  'prod-001': null,
  'prod-002': null,
  'prod-003': null,
  'prod-004': null,
  'prod-005': null,
  'prod-006': null,
  'prod-007': null,
  'prod-008': null,
  'prod-009': null,
  'prod-010': null,
  'prod-011': null,
  'prod-012': null
};

async function syncCategories(categories) {
  console.log('\n📁 Синхронизация категорий...');
  
  for (const cat of categories) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('name', cat.name)
      .single();

    if (existing) {
      categoryMapping[cat.id] = existing.id;
      console.log(`✓ Категория "${cat.name}" уже существует: ${existing.id}`);
    } else {
      const { data: created, error } = await supabase
        .from('categories')
        .insert({
          name: cat.name,
          description: cat.description
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Ошибка создания категории "${cat.name}":`, error);
      } else {
        categoryMapping[cat.id] = created.id;
        console.log(`✓ Создана категория "${cat.name}": ${created.id}`);
      }
    }
  }
}

async function syncProducts(products) {
  console.log('\n📦 Синхронизация товаров...');
  
  for (const prod of products) {
    // Находим существующий продукт по имени
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('name', prod.name)
      .single();

    const categoryId = categoryMapping[prod.category_sqlite_id];
    
    const productData = {
      name: prod.name,
      description: prod.description,
      price: prod.price,
      image_url: prod.image_url,
      stock: prod.stock,
      is_active: prod.is_active,
      category_id: categoryId
    };

    if (existing) {
      // Обновляем существующий
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', existing.id);

      if (error) {
        console.error(`❌ Ошибка обновления "${prod.name}":`, error);
      } else {
        productMapping[prod.sqlite_id] = existing.id;
        console.log(`✓ Обновлен "${prod.name}": ${prod.price}₽`);
      }
    } else {
      // Создаем новый
      const { data: created, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) {
        console.error(`❌ Ошибка создания "${prod.name}":`, error);
      } else {
        productMapping[prod.sqlite_id] = created.id;
        console.log(`✓ Создан "${prod.name}": ${prod.price}₽`);
      }
    }
  }
}

async function main() {
  console.log('🔄 Начинаем синхронизацию init-db.sql → Supabase\n');

  const categories = parseCategories(sqlContent);
  const products = parseProducts(sqlContent);

  console.log(`Найдено категорий: ${categories.length}`);
  console.log(`Найдено товаров: ${products.length}`);

  await syncCategories(categories);
  await syncProducts(products);

  console.log('\n✅ Синхронизация завершена!');
  console.log('Теперь изменения из init-db.sql применены в Supabase');
}

main().catch(console.error);
