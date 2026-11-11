// Catálogo de nichos em português, mapeados para etiquetas do OpenStreetMap.
// "filtros": seletores Overpass (sem o tipo do elemento e sem a área).
// "termos": palavras procuradas no nome do estabelecimento para ampliar a cobertura.

import { normalizarTexto } from './util.js';

export const NICHOS = [
  // Alimentação
  { id: 'restaurante', rotulo: 'Restaurantes', grupo: 'Alimentação', filtros: ['["amenity"="restaurant"]'], termos: ['restaurante'] },
  { id: 'pizzaria', rotulo: 'Pizzarias', grupo: 'Alimentação', filtros: ['["amenity"~"^(restaurant|fast_food)$"]["cuisine"~"pizza",i]'], termos: ['pizza'] },
  { id: 'hamburgueria', rotulo: 'Hamburguerias', grupo: 'Alimentação', filtros: ['["amenity"~"^(restaurant|fast_food)$"]["cuisine"~"burger",i]'], termos: ['burger', 'hamburg'] },
  { id: 'lanchonete', rotulo: 'Lanchonetes', grupo: 'Alimentação', filtros: ['["amenity"="fast_food"]'], termos: ['lanche', 'lanchonete'] },
  { id: 'japones', rotulo: 'Restaurantes japoneses', grupo: 'Alimentação', filtros: ['["amenity"="restaurant"]["cuisine"~"japanese|sushi",i]'], termos: ['sushi', 'temaki'] },
  { id: 'padaria', rotulo: 'Padarias', grupo: 'Alimentação', filtros: ['["shop"="bakery"]'], termos: ['padaria', 'panificadora'] },
  { id: 'cafeteria', rotulo: 'Cafeterias', grupo: 'Alimentação', filtros: ['["amenity"="cafe"]'], termos: ['cafeteria', 'café'] },
  { id: 'bar', rotulo: 'Bares e pubs', grupo: 'Alimentação', filtros: ['["amenity"~"^(bar|pub|biergarten)$"]'], termos: ['bar ', 'choperia'] },
  { id: 'sorveteria', rotulo: 'Sorveterias e açaí', grupo: 'Alimentação', filtros: ['["amenity"="ice_cream"]', '["shop"="ice_cream"]'], termos: ['sorvete', 'açaí', 'acai'] },
  { id: 'doceria', rotulo: 'Docerias e confeitarias', grupo: 'Alimentação', filtros: ['["shop"~"^(confectionery|pastry|chocolate)$"]'], termos: ['doceria', 'confeitaria', 'doces'] },
  { id: 'acougue', rotulo: 'Açougues', grupo: 'Alimentação', filtros: ['["shop"="butcher"]'], termos: ['açougue', 'acougue'] },
  { id: 'mercado', rotulo: 'Mercados e supermercados', grupo: 'Alimentação', filtros: ['["shop"~"^(supermarket|convenience|greengrocer)$"]'], termos: ['mercado', 'mercearia', 'hortifruti'] },
  { id: 'bebidas', rotulo: 'Distribuidoras de bebidas', grupo: 'Alimentação', filtros: ['["shop"~"^(alcohol|beverages|wine)$"]'], termos: ['bebidas', 'adega'] },

  // Saúde
  { id: 'dentista', rotulo: 'Dentistas e clínicas odontológicas', grupo: 'Saúde', filtros: ['["amenity"="dentist"]', '["healthcare"="dentist"]'], termos: ['odonto', 'dentista'] },
  { id: 'clinica', rotulo: 'Clínicas médicas', grupo: 'Saúde', filtros: ['["amenity"="clinic"]', '["healthcare"="clinic"]'], termos: [] },
  { id: 'medico', rotulo: 'Consultórios médicos', grupo: 'Saúde', filtros: ['["amenity"="doctors"]', '["healthcare"="doctor"]'], termos: [] },
  { id: 'farmacia', rotulo: 'Farmácias', grupo: 'Saúde', filtros: ['["amenity"="pharmacy"]', '["healthcare"="pharmacy"]', '["shop"="chemist"]'], termos: ['farmácia', 'drogaria'] },
  { id: 'fisioterapia', rotulo: 'Fisioterapia', grupo: 'Saúde', filtros: ['["healthcare"="physiotherapist"]'], termos: ['fisio', 'pilates'] },
  { id: 'psicologo', rotulo: 'Psicólogos', grupo: 'Saúde', filtros: ['["healthcare"~"^(psychotherapist|psychologist)$"]'], termos: ['psicolog'] },
  { id: 'nutricionista', rotulo: 'Nutricionistas', grupo: 'Saúde', filtros: ['["healthcare"="nutrition_counselling"]'], termos: ['nutricionista', 'nutrição'] },
  { id: 'laboratorio', rotulo: 'Laboratórios', grupo: 'Saúde', filtros: ['["healthcare"="laboratory"]'], termos: ['laboratório', 'laboratorio', 'análises'] },
  { id: 'otica', rotulo: 'Óticas', grupo: 'Saúde', filtros: ['["shop"="optician"]'], termos: ['ótica', 'otica'] },
  { id: 'hospital', rotulo: 'Hospitais', grupo: 'Saúde', filtros: ['["amenity"="hospital"]'], termos: ['hospital'] },
  { id: 'veterinario', rotulo: 'Veterinários', grupo: 'Pet', filtros: ['["amenity"="veterinary"]'], termos: ['veterin', 'vet '] },
  { id: 'petshop', rotulo: 'Pet shops', grupo: 'Pet', filtros: ['["shop"~"^(pet|pet_grooming)$"]'], termos: ['pet shop', 'petshop', 'banho e tosa'] },

  // Beleza e bem-estar
  { id: 'salao', rotulo: 'Salões de beleza', grupo: 'Beleza', filtros: ['["shop"="hairdresser"]'], termos: ['cabeleireir', 'hair studio'] },
  { id: 'barbearia', rotulo: 'Barbearias', grupo: 'Beleza', filtros: ['["shop"="hairdresser"]["hairdresser"~"barber",i]', '["shop"="barber"]'], termos: ['barbearia', 'barber'] },
  { id: 'estetica', rotulo: 'Clínicas de estética', grupo: 'Beleza', filtros: ['["shop"="beauty"]'], termos: ['depila', 'harmonização', 'estética facial'] },
  { id: 'manicure', rotulo: 'Manicure e esmalterias', grupo: 'Beleza', filtros: ['["shop"="beauty"]["beauty"~"nails",i]'], termos: ['esmalteria', 'manicure', 'nail'] },
  { id: 'academia', rotulo: 'Academias', grupo: 'Beleza', filtros: ['["leisure"="fitness_centre"]', '["amenity"="gym"]'], termos: ['academia', 'fitness', 'crossfit'] },
  { id: 'tatuagem', rotulo: 'Estúdios de tatuagem', grupo: 'Beleza', filtros: ['["shop"="tattoo"]'], termos: ['tattoo', 'tatuagem'] },
  { id: 'massagem', rotulo: 'Spas e massagem', grupo: 'Beleza', filtros: ['["shop"="massage"]', '["leisure"="spa"]'], termos: ['spa', 'massagem'] },
  { id: 'cosmeticos', rotulo: 'Lojas de cosméticos e perfumaria', grupo: 'Beleza', filtros: ['["shop"~"^(cosmetics|perfumery)$"]'], termos: ['cosméticos', 'perfumaria'] },

  // Automotivo
  { id: 'oficina', rotulo: 'Oficinas mecânicas', grupo: 'Automotivo', filtros: ['["shop"="car_repair"]'], termos: ['mecânica', 'mecanica', 'auto center'] },
  { id: 'autopecas', rotulo: 'Autopeças', grupo: 'Automotivo', filtros: ['["shop"="car_parts"]'], termos: ['autopeças', 'auto peças'] },
  { id: 'lavarapido', rotulo: 'Lava-rápidos e estética automotiva', grupo: 'Automotivo', filtros: ['["amenity"="car_wash"]'], termos: ['lava rápido', 'lava jato', 'lava-rápido'] },
  { id: 'concessionaria', rotulo: 'Concessionárias e lojas de veículos', grupo: 'Automotivo', filtros: ['["shop"="car"]'], termos: ['veículos', 'multimarcas'] },
  { id: 'borracharia', rotulo: 'Borracharias e pneus', grupo: 'Automotivo', filtros: ['["shop"="tyres"]'], termos: ['borracharia', 'pneus'] },
  { id: 'motos', rotulo: 'Lojas e oficinas de motos', grupo: 'Automotivo', filtros: ['["shop"~"^(motorcycle|motorcycle_repair)$"]'], termos: ['motos', 'moto peças'] },
  { id: 'funilaria', rotulo: 'Funilaria e pintura automotiva', grupo: 'Automotivo', filtros: ['["craft"="car_painter"]'], termos: ['funilaria', 'pintura automotiva'] },
  { id: 'posto', rotulo: 'Postos de combustível', grupo: 'Automotivo', filtros: ['["amenity"="fuel"]'], termos: ['combustível', 'auto posto'] },
  { id: 'autoescola', rotulo: 'Autoescolas', grupo: 'Automotivo', filtros: ['["amenity"="driving_school"]'], termos: ['autoescola', 'auto escola', 'cfc'] },

  // Serviços profissionais
  { id: 'advogado', rotulo: 'Advogados e escritórios de advocacia', grupo: 'Serviços', filtros: ['["office"="lawyer"]'], termos: ['advoga', 'advocacia', 'jurídic'] },
  { id: 'contabilidade', rotulo: 'Contabilidade', grupo: 'Serviços', filtros: ['["office"~"^(accountant|tax_advisor)$"]'], termos: ['contábil', 'contabil', 'contabilidade'] },
  { id: 'imobiliaria', rotulo: 'Imobiliárias', grupo: 'Serviços', filtros: ['["office"="estate_agent"]', '["shop"="estate_agent"]'], termos: ['imobiliária', 'imoveis', 'imóveis'] },
  { id: 'seguros', rotulo: 'Corretoras de seguros', grupo: 'Serviços', filtros: ['["office"="insurance"]'], termos: ['seguros'] },
  { id: 'arquitetura', rotulo: 'Arquitetura e engenharia', grupo: 'Serviços', filtros: ['["office"~"^(architect|engineer)$"]'], termos: ['arquitetura', 'engenharia'] },
  { id: 'marketing', rotulo: 'Agências de marketing e publicidade', grupo: 'Serviços', filtros: ['["office"~"^(advertising_agency|marketing)$"]'], termos: ['marketing', 'publicidade'] },
  { id: 'ti', rotulo: 'Empresas de TI e software', grupo: 'Serviços', filtros: ['["office"~"^(it|software|telecommunication)$"]'], termos: ['software', 'informática', 'tecnologia'] },
  { id: 'coworking', rotulo: 'Coworkings', grupo: 'Serviços', filtros: ['["amenity"="coworking_space"]', '["office"="coworking"]'], termos: ['coworking'] },
  { id: 'viagens', rotulo: 'Agências de viagens', grupo: 'Serviços', filtros: ['["shop"="travel_agency"]', '["office"="travel_agent"]'], termos: ['viagens', 'turismo'] },
  { id: 'lavanderia', rotulo: 'Lavanderias', grupo: 'Serviços', filtros: ['["shop"~"^(laundry|dry_cleaning)$"]'], termos: ['lavanderia'] },
  { id: 'chaveiro', rotulo: 'Chaveiros', grupo: 'Serviços', filtros: ['["shop"="locksmith"]', '["craft"~"^(locksmith|key_cutter)$"]'], termos: ['chaveiro'] },
  { id: 'grafica', rotulo: 'Gráficas e copiadoras', grupo: 'Serviços', filtros: ['["shop"="copyshop"]', '["craft"="printer"]'], termos: ['gráfica', 'grafica', 'copiadora'] },
  { id: 'fotografo', rotulo: 'Fotógrafos', grupo: 'Serviços', filtros: ['["craft"="photographer"]', '["shop"="photo"]'], termos: ['fotografia', 'foto'] },
  { id: 'eletricista', rotulo: 'Eletricistas', grupo: 'Serviços', filtros: ['["craft"="electrician"]'], termos: ['eletricista'] },
  { id: 'encanador', rotulo: 'Encanadores e desentupidoras', grupo: 'Serviços', filtros: ['["craft"="plumber"]'], termos: ['encanador', 'desentup'] },
  { id: 'marcenaria', rotulo: 'Marcenarias e móveis planejados', grupo: 'Serviços', filtros: ['["craft"~"^(carpenter|cabinet_maker)$"]'], termos: ['marcenaria', 'planejados'] },
  { id: 'costura', rotulo: 'Costureiras e ateliês', grupo: 'Serviços', filtros: ['["craft"~"^(tailor|dressmaker)$"]', '["shop"="tailor"]'], termos: ['costura', 'ateliê', 'atelier'] },
  { id: 'eventos', rotulo: 'Buffets e espaços de eventos', grupo: 'Serviços', filtros: ['["amenity"="events_venue"]'], termos: ['buffet', 'eventos', 'festas'] },

  // Varejo
  { id: 'roupas', rotulo: 'Lojas de roupas', grupo: 'Varejo', filtros: ['["shop"~"^(clothes|boutique|fashion)$"]'], termos: ['moda', 'boutique', 'confecç'] },
  { id: 'calcados', rotulo: 'Lojas de calçados', grupo: 'Varejo', filtros: ['["shop"="shoes"]'], termos: ['calçados', 'calcados'] },
  { id: 'moveis', rotulo: 'Lojas de móveis e decoração', grupo: 'Varejo', filtros: ['["shop"~"^(furniture|interior_decoration|houseware)$"]'], termos: ['móveis', 'moveis', 'decoração'] },
  { id: 'construcao', rotulo: 'Materiais de construção', grupo: 'Varejo', filtros: ['["shop"~"^(hardware|doityourself|trade|paint)$"]'], termos: ['materiais de construção', 'material de construção', 'tintas'] },
  { id: 'eletronicos', rotulo: 'Eletrônicos e celulares', grupo: 'Varejo', filtros: ['["shop"~"^(electronics|mobile_phone|computer)$"]'], termos: ['celular', 'informática', 'eletrônicos'] },
  { id: 'floricultura', rotulo: 'Floriculturas', grupo: 'Varejo', filtros: ['["shop"~"^(florist|garden_centre)$"]'], termos: ['flores', 'floricultura'] },
  { id: 'papelaria', rotulo: 'Papelarias', grupo: 'Varejo', filtros: ['["shop"="stationery"]'], termos: ['papelaria'] },
  { id: 'livraria', rotulo: 'Livrarias', grupo: 'Varejo', filtros: ['["shop"="books"]'], termos: ['livraria'] },
  { id: 'joalheria', rotulo: 'Joalherias e relojoarias', grupo: 'Varejo', filtros: ['["shop"~"^(jewelry|watches)$"]'], termos: ['joias', 'joalheria', 'relojoaria'] },
  { id: 'brinquedos', rotulo: 'Lojas de brinquedos', grupo: 'Varejo', filtros: ['["shop"="toys"]'], termos: ['brinquedos'] },
  { id: 'bicicletaria', rotulo: 'Bicicletarias', grupo: 'Varejo', filtros: ['["shop"="bicycle"]'], termos: ['bike', 'bicicletaria'] },
  { id: 'esportes', rotulo: 'Artigos esportivos', grupo: 'Varejo', filtros: ['["shop"~"^(sports|outdoor)$"]'], termos: ['esportes', 'esportivos'] },
  { id: 'presentes', rotulo: 'Lojas de presentes', grupo: 'Varejo', filtros: ['["shop"~"^(gift|variety_store)$"]'], termos: ['presentes', 'variedades'] },

  // Educação
  { id: 'escola', rotulo: 'Escolas', grupo: 'Educação', filtros: ['["amenity"="school"]'], termos: ['colégio'] },
  { id: 'idiomas', rotulo: 'Escolas de idiomas', grupo: 'Educação', filtros: ['["amenity"="language_school"]'], termos: ['inglês', 'idiomas', 'english'] },
  { id: 'faculdade', rotulo: 'Faculdades', grupo: 'Educação', filtros: ['["amenity"~"^(college|university)$"]'], termos: ['faculdade', 'universidade'] },
  { id: 'creche', rotulo: 'Creches e berçários', grupo: 'Educação', filtros: ['["amenity"~"^(kindergarten|childcare)$"]'], termos: ['creche', 'berçário', 'escolinha'] },
  { id: 'cursos', rotulo: 'Cursos e treinamentos', grupo: 'Educação', filtros: ['["amenity"~"^(prep_school|training)$"]'], termos: ['cursos', 'treinamento', 'pré-vestibular'] },
  { id: 'musica', rotulo: 'Escolas de música e dança', grupo: 'Educação', filtros: ['["amenity"~"^(music_school|dancing_school)$"]', '["leisure"="dance"]'], termos: ['música', 'dança', 'ballet'] },

  // Hospedagem
  { id: 'hotel', rotulo: 'Hotéis', grupo: 'Hospedagem', filtros: ['["tourism"="hotel"]'], termos: ['hotel'] },
  { id: 'pousada', rotulo: 'Pousadas e hostels', grupo: 'Hospedagem', filtros: ['["tourism"~"^(guest_house|hostel|chalet|apartment)$"]'], termos: ['pousada', 'hostel'] },
  { id: 'motel', rotulo: 'Motéis', grupo: 'Hospedagem', filtros: ['["tourism"="motel"]', '["amenity"="love_hotel"]'], termos: ['motel'] },
];

/** Tradução das principais etiquetas do OSM para categorias legíveis em português. */
const CATEGORIAS = {
  'amenity=restaurant': 'Restaurante', 'amenity=fast_food': 'Lanchonete', 'amenity=cafe': 'Cafeteria', 'amenity=bar': 'Bar',
  'amenity=pub': 'Pub', 'amenity=ice_cream': 'Sorveteria', 'amenity=dentist': 'Dentista', 'amenity=clinic': 'Clínica',
  'amenity=doctors': 'Consultório médico', 'amenity=pharmacy': 'Farmácia', 'amenity=hospital': 'Hospital',
  'amenity=veterinary': 'Veterinário', 'amenity=car_wash': 'Lava-rápido', 'amenity=fuel': 'Posto de combustível',
  'amenity=driving_school': 'Autoescola', 'amenity=school': 'Escola', 'amenity=language_school': 'Escola de idiomas',
  'amenity=college': 'Faculdade', 'amenity=university': 'Universidade', 'amenity=kindergarten': 'Creche',
  'amenity=childcare': 'Creche', 'amenity=music_school': 'Escola de música', 'amenity=dancing_school': 'Escola de dança',
  'amenity=events_venue': 'Espaço de eventos', 'amenity=coworking_space': 'Coworking', 'amenity=bank': 'Banco',
  'amenity=prep_school': 'Curso preparatório', 'amenity=training': 'Treinamentos', 'amenity=gym': 'Academia',
  'shop=bakery': 'Padaria', 'shop=supermarket': 'Supermercado', 'shop=convenience': 'Mercado', 'shop=greengrocer': 'Hortifrúti',
  'shop=butcher': 'Açougue', 'shop=confectionery': 'Doceria', 'shop=pastry': 'Confeitaria', 'shop=chocolate': 'Chocolateria',
  'shop=alcohol': 'Bebidas', 'shop=beverages': 'Bebidas', 'shop=wine': 'Adega', 'shop=hairdresser': 'Salão de beleza',
  'shop=barber': 'Barbearia', 'shop=beauty': 'Estética', 'shop=tattoo': 'Tatuagem', 'shop=massage': 'Massagem',
  'shop=cosmetics': 'Cosméticos', 'shop=perfumery': 'Perfumaria', 'shop=optician': 'Ótica', 'shop=pet': 'Pet shop',
  'shop=pet_grooming': 'Banho e tosa', 'shop=car_repair': 'Oficina mecânica', 'shop=car_parts': 'Autopeças', 'shop=car': 'Veículos',
  'shop=tyres': 'Pneus', 'shop=motorcycle': 'Motos', 'shop=clothes': 'Roupas', 'shop=boutique': 'Boutique', 'shop=shoes': 'Calçados',
  'shop=furniture': 'Móveis', 'shop=interior_decoration': 'Decoração', 'shop=hardware': 'Ferragens', 'shop=doityourself': 'Materiais de construção',
  'shop=paint': 'Tintas', 'shop=electronics': 'Eletrônicos', 'shop=mobile_phone': 'Celulares', 'shop=computer': 'Informática',
  'shop=florist': 'Floricultura', 'shop=garden_centre': 'Jardinagem', 'shop=stationery': 'Papelaria', 'shop=books': 'Livraria',
  'shop=jewelry': 'Joalheria', 'shop=watches': 'Relojoaria', 'shop=toys': 'Brinquedos', 'shop=bicycle': 'Bicicletaria',
  'shop=sports': 'Esportes', 'shop=gift': 'Presentes', 'shop=variety_store': 'Variedades', 'shop=travel_agency': 'Agência de viagens',
  'shop=laundry': 'Lavanderia', 'shop=dry_cleaning': 'Lavanderia', 'shop=locksmith': 'Chaveiro', 'shop=copyshop': 'Copiadora',
  'shop=photo': 'Fotografia', 'shop=estate_agent': 'Imobiliária', 'shop=chemist': 'Drogaria', 'shop=ice_cream': 'Sorveteria',
  'office=lawyer': 'Advocacia', 'office=accountant': 'Contabilidade', 'office=tax_advisor': 'Consultoria tributária',
  'office=estate_agent': 'Imobiliária', 'office=insurance': 'Seguros', 'office=architect': 'Arquitetura', 'office=engineer': 'Engenharia',
  'office=advertising_agency': 'Agência de publicidade', 'office=marketing': 'Marketing', 'office=it': 'Tecnologia',
  'office=software': 'Software', 'office=coworking': 'Coworking', 'office=travel_agent': 'Agência de viagens', 'office=company': 'Empresa',
  'craft=photographer': 'Fotógrafo', 'craft=electrician': 'Eletricista', 'craft=plumber': 'Encanador', 'craft=carpenter': 'Marcenaria',
  'craft=printer': 'Gráfica', 'craft=car_painter': 'Funilaria', 'craft=tailor': 'Costura', 'craft=dressmaker': 'Costura', 'shop=tailor': 'Costura', 'healthcare=nutrition_counselling': 'Nutrição', 'craft=key_cutter': 'Chaveiro', 'healthcare=dentist': 'Dentista', 'healthcare=clinic': 'Clínica',
  'healthcare=physiotherapist': 'Fisioterapia', 'healthcare=psychotherapist': 'Psicologia', 'healthcare=laboratory': 'Laboratório',
  'leisure=fitness_centre': 'Academia', 'leisure=dance': 'Dança', 'leisure=spa': 'Spa', 'tourism=hotel': 'Hotel',
  'tourism=guest_house': 'Pousada', 'tourism=hostel': 'Hostel', 'tourism=motel': 'Motel',
};

const CHAVES_CATEGORIA = ['healthcare', 'amenity', 'shop', 'office', 'craft', 'leisure', 'tourism'];

export function categoriaDasEtiquetas(tags = {}) {
  if (tags.shop === 'hairdresser' && /barber/i.test(tags.hairdresser || '')) return 'Barbearia';
  for (const chave of CHAVES_CATEGORIA) {
    const valor = tags[chave];
    if (!valor) continue;
    const rotulo = CATEGORIAS[`${chave}=${valor}`];
    if (rotulo) return rotulo;
  }
  for (const chave of CHAVES_CATEGORIA) {
    if (tags[chave] && tags[chave] !== 'yes') return tags[chave].replace(/_/g, ' ');
  }
  return 'Estabelecimento';
}

const PALAVRAS_VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'a', 'o', 'as', 'os', 'na', 'no']);

const SINONIMOS = {
  contabilidade: ['contador', 'escritorio contabil'],
  advogado: ['advocacia', 'escritorio de advocacia', 'juridico'],
  dentista: ['odontologia', 'odontologico', 'consultorio odontologico'],
  oficina: ['mecanico', 'mecanica', 'auto center'],
  salao: ['cabeleireiro', 'cabeleireira', 'salao'],
  academia: ['crossfit', 'musculacao', 'fitness'],
  imobiliaria: ['corretor de imoveis', 'imoveis'],
  petshop: ['banho e tosa', 'pet'],
  hamburgueria: ['hamburguer', 'burger'],
  japones: ['sushi', 'comida japonesa'],
  mercado: ['supermercado', 'mercearia', 'minimercado'],
  marketing: ['agencia de marketing', 'publicidade', 'agencia digital'],
  estetica: ['esteticista', 'depilacao'],
  medico: ['medicos', 'consultorio medico'],
  psicologo: ['psicologia', 'terapeuta'],
  autoescola: ['cfc'],
  construcao: ['material de construcao', 'home center'],
  eletronicos: ['assistencia tecnica', 'celular'],
};

function singular(p) {
  if (p.length <= 3) return p;
  if (p.endsWith('oes') || p.endsWith('aes')) return `${p.slice(0, -3)}ao`;
  if (p.endsWith('eses')) return p.slice(0, -2);
  if (p.endsWith('ns')) return `${p.slice(0, -2)}m`;
  if (p.endsWith('s')) return p.slice(0, -1);
  return p;
}

/** Quebra um texto em palavras significativas, sem acento e no singular. */
export function palavrasChave(texto) {
  return normalizarTexto(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p && !PALAVRAS_VAZIAS.has(p))
    .map(singular);
}

let indice;
function construirIndice() {
  const freq = new Map();
  const vocab = NICHOS.map((n) => {
    const fontes = [n.id, n.rotulo, ...n.termos, ...(SINONIMOS[n.id] || [])];
    const palavras = new Set(fontes.flatMap(palavrasChave));
    for (const p of palavras) freq.set(p, (freq.get(p) || 0) + 1);
    const frases = new Set(fontes.map((f) => palavrasChave(f).join(' ')));
    return { nicho: n, palavras, frases };
  });
  return { vocab, freq };
}

function casa(a, b) {
  if (a === b) return true;
  return a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a));
}

/** Encontra o nicho do catálogo que corresponde ao texto digitado (ou null para busca livre). */
export function encontrarNicho(texto) {
  const consulta = palavrasChave(texto);
  if (!consulta.length) return null;
  indice ||= construirIndice();
  const frase = consulta.join(' ');
  const exato = indice.vocab.find((v) => v.frases.has(frase));
  if (exato) return exato.nicho;
  let melhor = null;
  let melhorNota = 0;
  for (const v of indice.vocab) {
    let nota = 0;
    for (const q of consulta) {
      const achada = [...v.palavras].find((p) => casa(p, q));
      if (achada) nota += 1 / (indice.freq.get(achada) || 1);
    }
    if (nota > melhorNota) { melhorNota = nota; melhor = v.nicho; }
  }
  return melhorNota >= 0.5 ? melhor : null;
}

/** Converte uma busca livre em expressão regular para o nome (palavras na ordem digitada). */
export function regexBuscaLivre(texto) {
  const palavras = normalizarTexto(texto).split(/[^a-z0-9]+/).filter((p) => p && !PALAVRAS_VAZIAS.has(p) && !['loja', 'empresa', 'servico', 'servicos'].includes(p));
  return palavras.length ? palavras : [normalizarTexto(texto)];
}

export function gruposDeNichos() {
  const grupos = new Map();
  for (const n of NICHOS) {
    if (!grupos.has(n.grupo)) grupos.set(n.grupo, []);
    grupos.get(n.grupo).push(n);
  }
  return grupos;
}
