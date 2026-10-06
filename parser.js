/**
 * Получение значения переданного атрибута элемента, поиск которого осуществляется
 * в DOM-элементе(документе) по переданному селектору.
 * @param {Object} element DOM-элемент в котором осуществляется поиск
 * @param {string} selector
 * @param {string} attribute
 * @returns {string} значение атрибута
 */
function getSimpleAttributeValue(element, selector, attribute) {
    const pageElement = element.querySelector(selector);
    const attributeValue = pageElement.getAttribute(attribute).trim();
    return attributeValue;
}

/**
 * Получение числового значения цены и кода валюты из переданной строки типа: "₽34123"
 *Пример входных данных и вывода: "₽34123" => {value: 34123, currency: "RUB"}
 * @param {string} priceWithCurrency
 * @returns {Object}
 */
function getPriceAndCurrency(priceWithCurrency) {
    let priceArr = Array.from(priceWithCurrency);
    const currencyArr = priceArr.splice(0, 1);
    let price = priceArr.join("");
    price = Number(price);
    switch (currencyArr.toString()) {
        case "$":
            currency = "USD";
            break;
        case "€":
            currency = "EUR";
            break;
        case "₽":
            currency = "RUB";
            break;
    }
    return { currency, price };
}

/**
 * Извлекает заголовок страницы без названия сайта
 * @returns {string}
 */
function getPageTitle() {
    const titleFull = document.querySelector("title");
    const [pageTitle] = titleFull.textContent.split("—");
    return pageTitle.trim();
}

/**
 * Извлекает ключевые слова из мета-тега и собрает в виде массива слов.
 * @returns {Array<string>}
 */
function getPageKeywords() {
    const keywords = getSimpleAttributeValue(
        document,
        "[name = 'keywords']",
        "content",
    );
    const keywordsArr = keywords.split(",").map((keyword) => keyword.trim());
    return keywordsArr;
}

/**
 * Извлекает Оpengraph-описание из мета-тега и собрает в виде объекта.
 * @returns {Object<string>}
 */
function getOGData() {
    const ogTitleFull = getSimpleAttributeValue(
        document,
        "[property = 'og:title']",
        "content",
    );
    const [ogTitleRaw] = ogTitleFull.split("—");
    const ogImage = getSimpleAttributeValue(
        document,
        "[property = 'og:image']",
        "content",
    );
    const ogType = getSimpleAttributeValue(
        document,
        "[property = 'og:type']",
        "content",
    );
    return {
        title: ogTitleRaw.trim(),
        image: ogImage,
        type: ogType,
    };
}

/**
 * Извлекает мета-информацию из страницы  — содержимое заголовка и мета-тегов из области
 * head и языка с тега html
 * @returns {Object}
 */
function getPageMeta() {
    const meta = {};
    // Язык страницы с тега html.
    meta.language = getSimpleAttributeValue(document, "html", "lang");
    // Заголовок страницы без названия сайта.
    meta.title = getPageTitle();
    // Ключевые слова из мета-тега, собранные в виде массива слов
    meta.keywords = getPageKeywords();
    // Описание из мета-тега.
    meta.description = getSimpleAttributeValue(
        document,
        "[name = 'description']",
        "content",
    );
    // Оpengraph-описание в виде объекта
    meta.opengraph = getOGData();
    return meta;
}

/**
 * Извлекает массив изображений продукта, с миниатюрами и alt описанием
 * @returns {Array<Object>}
 */
function getProductImages() {
    const productImages = [];
    const imageButtons = document.querySelectorAll(".product nav button");
    imageButtons.forEach((button) => {
        const productImage = {};
        productImage.preview = getSimpleAttributeValue(button, "img", "src");
        productImage.full = button.querySelector("img").dataset.src;
        productImage.alt = getSimpleAttributeValue(button, "img", "alt");

        if (button.hasAttribute("disabled")) {
            productImages.unshift(productImage);
        } else {
            productImages.push(productImage);
        }
    });
    return productImages;
}

/**
 * Извлекает коллекцию из массивов бирок, категорий и скидок. Под названием товара есть строка
 * с разноцветными тегами. Иногда их может не быть совсем, либо их ограниченное количество.
 * Цветами различаются типы тега. Зелёный отвечает за категорию, синий — за бирку,
 * красный — за скидку.
 * @returns {Object<Array>}
 */
function getProductTags() {
    const productTags = {};
    const tags = document.querySelector(".tags").children;
    for (let tag of tags) {
        if (tag.classList.contains("green")) {
            if (!productTags.category) {
                productTags.category = [];
            }
            productTags.category.push(tag.textContent.trim());
        } else if (tag.classList.contains("blue")) {
            if (!productTags.label) {
                productTags.label = [];
            }
            productTags.label.push(tag.textContent.trim());
        } else if (tag.classList.contains("red")) {
            if (!productTags.discount) {
                productTags.discount = [];
            }
            productTags.discount.push(tag.textContent.trim());
        }
    }
    return productTags;
}

/**
 * Извлекает из страницы следующие значения:
 * Цена товара с учётом скидки — крупная незачёркнутая цифра.
 * Цена товара без скидки — зачёркнута часть цены.
 * Размер скидки, как в процентах, так и в валюте. Если она есть, считается разница между ценами и делится на полную цену, если нет — скидка 0%.
 * Валюта — символ перед товаром: $, € или ₽.  Результат записывается в виде кода валюты - USD, EUR или RUB соответственно.
 * @returns {Object}
 */
function getProductPriceData() {
    const productPriceData = {};
    let discount = 0;
    let discountPercent = 0;
    let oldPrice;
    let [priceWithCurrency, oldPriceWithCurrency] = document
        .querySelector(".price")
        .textContent.trim()
        .split("\n");
    // Получаем код валюты и числовое значение цены
    const { price, currency } = getPriceAndCurrency(priceWithCurrency.trim());
    if (oldPriceWithCurrency) {
        oldPriceWithCurrency = oldPriceWithCurrency.trim();
        const oldPriceAndCurrency = getPriceAndCurrency(oldPriceWithCurrency);
        oldPrice = oldPriceAndCurrency.price;
        discount = oldPrice - price;
        discountPercent = ((discount / oldPrice) * 100).toFixed(2);
    }
    productPriceData.price = price;
    productPriceData.currency = currency;
    productPriceData.oldPrice = oldPrice;
    productPriceData.discount = discount;
    productPriceData.discountPercent = `${discountPercent}%`;
    return productPriceData;
}

/**
 * Извлекает из страницы свойства товара — объект с ключами и значениями. В качестве ключей
 * взяты строки слева, а в качестве значений — строки справа в каждой строчке.
 * @returns {Object}
 */
function getProductProperties() {
    const properties = [];
    const rawProperties = document.querySelectorAll(".properties li");
    rawProperties.forEach((rawProperty) => {
        const rawPropertyArr = rawProperty.textContent.trim().split("\n");
        const propertyArr = rawPropertyArr.map((item) => item.trim());
        properties.push(propertyArr);
    });
    return Object.fromEntries(properties);
}

/**
 * Извлекает описание товара, скрытое под сворачиваемым блоком. Оно состоит из нескольких
 * отформатированных параграфов, то есть включает в себя произвольную html-разметку
 * без атрибутов для форматирования текста.
 * @returns {String}
 */
function getProductDescription() {
    // получаем клопию HTML разметки, для преобразования
    const descriptionNodeClone = document
        .querySelector(".description")
        .cloneNode(true);
    // удаляем все атрибуты
    for (let desc of descriptionNodeClone.children) {
        for (let i = desc.attributes.length - 1; i >= 0; i--) {
            desc.removeAttribute(desc.attributes[i].name);
        }
    }
    return descriptionNodeClone.innerHTML.trim();
}

/**
 * Извлекает данные карточки товара, который представлен на странице
 * @returns {Object}
 */
function getPageProduct() {
    const product = {};
    //Идентификатор товара в data-атрибуте.
    product.id = document.querySelector(".product").dataset.id;
    // Массив объектов с фотографиями, миниатуюрами и alt-описанием
    product.images = getProductImages();
    // Статус лайка. (проверяем наличие класса active у кнопки над основным изображением)
    product.isLiked = document
        .querySelector(".product .like")
        .classList.contains("active");
    // Название товара — текст в h1-теге.
    product.name = document.querySelector("h1").textContent;
    // Массивы бирок, категорий и скидок.
    product.tags = getProductTags();
    // Извлечем данные о цене с учётом скидки, цене без скидки, размере скидки в валюте и в процентах,
    // валюте  — символ перед товаром: $, € или ₽. Результат в виде кода валюты USD, EUR или RUB соответственно
    ({
        price: product.price,
        oldPrice: product.oldPrice,
        discount: product.discount,
        discountPercent: product.discountPercent,
        currency: product.currency,
    } = getProductPriceData());
    // Свойства товара — объект с ключами и значениями.
    product.properties = getProductProperties();
    // Полное описание товара
    product.description = getProductDescription();
    return product;
}

/**
 * Извлекает массив карточек предложенных дополнительных товаров
 * @returns {Array<Object>}
 */
function getPageSuggested() {
    const cardSuggestedNodes = document.querySelectorAll(".suggested article");
    const suggested = [...cardSuggestedNodes].map((card) => {
        const priceWithCurrency = card.querySelector("b").textContent.trim();
        const { price, currency } = getPriceAndCurrency(priceWithCurrency);
        const cardSuggested = {
            name: card.querySelector("h3").textContent.trim(),
            description: card.querySelector("p").textContent.trim(),
            image: getSimpleAttributeValue(card, "img", "src"),
            price: price.toString(),
            currency: currency,
        };
        return cardSuggested;
    });
    return suggested;
}

/**
 * Форматирует дату из вида "dd/mm/yyyy" => "dd.mm.yyyy"
 * @param {string} unformatedDate
 * @returns {string}
 */
function formateDate(unformatedDate) {
    const date = unformatedDate.split("/").join(".").trim();
    return date;
}

/**
 * Считает рейтинг отзыва (количество звезд в отзыве)
 * @param {Array} ratingArr
 * @returns {Number}
 */
function getRating(ratingArr) {
    const rating = ratingArr.reduce((starsSum, star) => {
        if (star.classList.contains("filled")) {
            starsSum++;
        }
        return starsSum;
    }, 0);
    return rating;
}

/**
 * Извлекает информацию об авторе отзыва: имя и ссылку на аватар
 * @param {Object} reviewCard
 * @returns {Object}
 */
function getAuthorData(reviewCard) {
    const author = {
        avatar: getSimpleAttributeValue(reviewCard, ".author img", "src"),
        name: reviewCard.querySelector(".author span").textContent.trim(),
    };
    return author;
}

/**
 * Извлекает массив карточек с обзорами на товар, представленный на странице
 * @returns {Array<Object>}
 */
function getPageReviews() {
    const reviewNodes = document.querySelectorAll(".reviews article");
    const reviews = [...reviewNodes].map((reviewCard) => {
        const ratingNodes = reviewCard.querySelector(".rating").children;
        const review = {
            title: reviewCard.querySelector(".title").textContent.trim(),
            description: reviewCard
                .querySelector(".title + p")
                .textContent.trim(),
            date: formateDate(
                reviewCard.querySelector(".author i").textContent,
            ),
            rating: getRating([...ratingNodes]),
            author: getAuthorData(reviewCard),
        };
        return review;
    });
    return reviews;
}

/**
 * Парсит страницу и выводит её содержимое в консоль в виде объеката, в котором содержатся
 * объект с информацией о метаданных, объект с информацией о товаре, массив с информацией
 * о других предлагаемых товарах и массив с информацией об отзывах на товар
 * @returns {Object<Object>}
 */
function parsePage() {
    const meta = getPageMeta();
    const product = getPageProduct();
    const suggested = getPageSuggested();
    const reviews = getPageReviews();
    return {
        meta,
        product,
        suggested,
        reviews,
    };
}

window.parsePage = parsePage;
