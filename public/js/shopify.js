/* ============================================================
   NOR PERFUME — SHOPIFY STOREFRONT API CLIENT
   Core client for handling GraphQL queries to Shopify.
   ============================================================ */

const SHOPIFY_CONFIG = {
    // Registered Shopify store domain
    domain: 'nor-perfume-2.myshopify.com',
    // Storefront API Public Access Token
    accessToken: '597e532f7345926a95b019ced728a002',
    apiVersion: '2024-01'
};

/**
 * Basic fetch wrapper for Shopify Storefront API (GraphQL)
 */
async function shopifyQuery(query, variables = {}) {
    const endpoint = `https://${SHOPIFY_CONFIG.domain}/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.accessToken,
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            throw new Error(`Shopify API error: ${response.statusText}`);
        }

        const json = await response.json();
        if (json.errors) {
            console.error('Shopify GraphQL Errors:', json.errors);
            return { errors: json.errors };
        }

        return json.data;
    } catch (error) {
        console.error('Shopify Fetch Error:', error);
        return null;
    }
}

const CART_FIELDS = `
    fragment CartFields on Cart {
        id
        checkoutUrl
        totalQuantity
        cost {
            subtotalAmount {
                amount
                currencyCode
            }
            totalAmount {
                amount
                currencyCode
            }
        }
        lines(first: 50) {
            edges {
                node {
                    id
                    quantity
                    merchandise {
                        ... on ProductVariant {
                            id
                            title
                            price {
                                amount
                                currencyCode
                            }
                            product {
                                title
                                handle
                                images(first: 1) {
                                    edges {
                                        node {
                                            url
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`;

// ─────────────────────────────────────────
// COMMON GRAPHQL QUERIES
// ─────────────────────────────────────────

const QUERIES = {
    // Fetch all products for the collection page
    getProducts: `
        query getProducts($first: Int = 20) {
            products(first: $first) {
                edges {
                    node {
                        id
                        title
                        handle
                        description
                        priceRange {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                        compareAtPriceRange {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                        images(first: 1) {
                            edges {
                                node {
                                    url
                                    altText
                                }
                            }
                        }
                        variants(first: 1) {
                            edges {
                                node {
                                    id
                                    title
                                    availableForSale
                                }
                            }
                        }
                    }
                }
            }
        }
    `,

    // Fetch single product by handle (for PDP)
    getProductByHandle: `
        query getProductByHandle($handle: String!) {
            product(handle: $handle) {
                id
                title
                handle
                availableForSale
                descriptionHtml
                priceRange {
                    minVariantPrice {
                        amount
                        currencyCode
                    }
                }
                compareAtPriceRange {
                    minVariantPrice {
                        amount
                        currencyCode
                    }
                }
                images(first: 5) {
                    edges {
                        node {
                            url
                            altText
                        }
                    }
                }
                variants(first: 20) {
                    edges {
                        node {
                            id
                            title
                            availableForSale
                            price {
                                amount
                                currencyCode
                            }
                            selectedOptions {
                                name
                                value
                            }
                        }
                    }
                }
                productType
                tags
                composition: metafield(namespace: "custom", key: "composition") {
                    value
                }
                howToUse: metafield(namespace: "custom", key: "how_to_use") {
                    value
                }
                whatsInTheBox: metafield(namespace: "custom", key: "whats_in_the_box") {
                    value
                }
            }
        }
    `,

    // Create a new cart
    createCart: `
        ${CART_FIELDS}
        mutation cartCreate($input: CartInput) {
            cartCreate(input: $input) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,

    // Add items to an existing cart
    addToCart: `
        ${CART_FIELDS}
        mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,

    // Update cart quantities
    updateCartLines: `
        ${CART_FIELDS}
        mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
            cartLinesUpdate(cartId: $cartId, lines: $lines) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,

    // Remove items from cart
    removeCartLines: `
        ${CART_FIELDS}
        mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
            cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,

    // Fetch existing cart status
    getCart: `
        ${CART_FIELDS}
        query getCart($cartId: ID!) {
            cart(id: $cartId) {
                ...CartFields
            }
        }
    `,

    // CUSTOMER AUTH & PROFILE
    customerCreate: `
        mutation customerCreate($input: CustomerCreateInput!) {
            customerCreate(input: $input) {
                customer {
                    id
                }
                customerUserErrors {
                    code
                    field
                    message
                }
            }
        }
    `,

    customerAccessTokenCreate: `
        mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
            customerAccessTokenCreate(input: $input) {
                customerAccessToken {
                    accessToken
                    expiresAt
                }
                customerUserErrors {
                    code
                    field
                    message
                }
            }
        }
    `,

    getCustomer: `
        query getCustomer($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) {
                id
                firstName
                lastName
                displayName
                email
                phone
                defaultAddress {
                    formatted
                }
                orders(first: 10, reverse: true) {
                    edges {
                        node {
                            id
                            orderNumber
                            processedAt
                            totalPrice {
                                amount
                                currencyCode
                            }
                            financialStatus
                            fulfillmentStatus
                            lineItems(first: 5) {
                                edges {
                                    node {
                                        title
                                        quantity
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `,

    customerUpdate: `
        mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
            customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
                customer {
                    id
                }
                customerUserErrors {
                    code
                    field
                    message
                }
            }
        }
    `,
    customerCreate: `
        mutation customerCreate($input: CustomerCreateInput!) {
            customerCreate(input: $input) {
                customer {
                    id
                    email
                }
                customerUserErrors {
                    code
                    field
                    message
                }
            }
        }
    `,
    customerEmailMarketingSubscribe: `
        mutation customerEmailMarketingSubscribe($input: CustomerEmailMarketingSubscribeInput!) {
            customerEmailMarketingSubscribe(input: $input) {
                emailMarketingConsent {
                    marketingState
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,

    // COLLECTION FETCHING
    getCollectionByHandle: `
        query getCollectionByHandle($handle: String!, $first: Int!) {
            collection(handle: $handle) {
                id
                title
                description
                products(first: $first) {
                    edges {
                        node {
                            id
                            title
                            handle
                            availableForSale
                            description
                            priceRange {
                                minVariantPrice {
                                    amount
                                    currencyCode
                                }
                            }
                            compareAtPriceRange {
                                minVariantPrice {
                                    amount
                                    currencyCode
                                }
                            }
                            images(first: 1) {
                                edges {
                                    node {
                                        url
                                        altText
                                    }
                                }
                            }
                            variants(first: 1) {
                                edges {
                                    node {
                                        id
                                        availableForSale
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `,
    getHeroSlider: `
        query getHeroSlider($handle: String!) {
            collection(handle: $handle) {
                products(first: 10) {
                    edges {
                        node {
                            id
                            title
                            handle
                            availableForSale
                            hero_image: metafield(namespace: "custom", key: "hero_image") {
                                value
                                reference {
                                    ... on MediaImage {
                                        image {
                                            url(transform: { maxWidth: 2000, preferredContentType: WEBP })
                                        }
                                    }
                                }
                            }
                            heroText: metafield(namespace: "custom", key: "hero_description") {
                                value
                            }
                            hero_mobile_image: metafield(namespace: "custom", key: "hero_mobile_image") {
                                reference {
                                    ... on MediaImage {
                                        image {
                                            url(transform: { maxWidth: 1000, preferredContentType: WEBP })
                                        }
                                    }
                                }
                            }
                            hero_mobile_video: metafield(namespace: "custom", key: "hero_mobile_video") {
                                reference {
                                    ... on Video {
                                        sources {
                                            url
                                            mimeType
                                            format
                                        }
                                    }
                                }
                            }
                            variants(first: 1) {
                                edges {
                                    node {
                                        id
                                        availableForSale
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `,
    getCollections: `
        query getCollections($first: Int = 10) {
            collections(first: $first) {
                edges {
                    node {
                        title
                        handle
                        image {
                            url(transform: { maxWidth: 1000, preferredContentType: WEBP })
                        }
                        products(first: 1) {
                            edges {
                                node {
                                    featuredImage {
                                        url(transform: { maxWidth: 1000, preferredContentType: WEBP })
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `,
    getProducts: `
        query getProducts($first: Int = 20) {
            products(first: $first) {
                edges {
                    node {
                        id
                        title
                        handle
                        availableForSale
                        priceRange {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                        compareAtPriceRange {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                        images(first: 1) {
                            edges {
                                node {
                                    url
                                }
                            }
                        }
                        variants(first: 1) {
                            edges {
                                node {
                                    id
                                    availableForSale
                                }
                            }
                        }
                    }
                }
            }
        }
    `,
    getBestSellersCollection: `
        query getBestSellersCollection($handle: String!, $first: Int!) {
            collection(handle: $handle) {
                products(first: $first) {
                    edges {
                        node {
                            id
                            title
                            handle
                            availableForSale
                            priceRange {
                                minVariantPrice {
                                    amount
                                }
                            }
                            compareAtPriceRange {
                                minVariantPrice {
                                    amount
                                    currencyCode
                                }
                            }
                            featuredImage {
                                url
                            }
                            variants(first: 1) {
                                edges {
                                    node {
                                        id
                                        availableForSale
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `,
    getNewArrivals: `
        query getNewArrivals($handle: String!, $first: Int = 10) {
            collection(handle: $handle) {
                products(first: $first) {
                    edges {
                        node {
                            id
                            title
                            handle
                            availableForSale
                            priceRange {
                                minVariantPrice {
                                    amount
                                }
                            }
                            compareAtPriceRange {
                                minVariantPrice {
                                    amount
                                    currencyCode
                                }
                            }
                            composition: metafield(namespace: "custom", key: "composition") {
                                value
                            }
                            featuredImage {
                                url(transform: { maxWidth: 2000, preferredContentType: WEBP })
                            }
                            variants(first: 1) {
                                edges {
                                    node {
                                        id
                                        availableForSale
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `

};

export { shopifyQuery, QUERIES, SHOPIFY_CONFIG };
