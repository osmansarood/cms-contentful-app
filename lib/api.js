const POST_GRAPHQL_FIELDS_COMMON = `
slug
title
coverImage {
  url
}
date
author {
  name
  picture {
    url
  }
}
excerpt
`
// Gatsby treats nested fields differently. Everything is present in 'raw' prop
const GATSBY_CONTENT_FIELD = `
content {raw}
`
const CONTENTFUL_CONTENT_FIELD = `
content {
  json
  links {
    assets {
      block {
        sys {
          id
        }
        url
        description
      }
    }
  }
}
`
// Keeping the POST_GRAPHQL_FIELDS for fetching from contentful API
const POST_GRAPHQL_FIELDS = POST_GRAPHQL_FIELDS_COMMON + CONTENTFUL_CONTENT_FIELD
async function fetchGraphQL(query, use_val = false, preview = false) {
  let url
  if (use_val)
    url = process.env.NETLIFY_CONTENT_CLOUD_API_URL
  else
    url = `https://graphql.contentful.com/content/v1/spaces/${process.env.CONTENTFUL_SPACE_ID}`
  const response = await  fetch(
		url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${
          preview
            ? process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN
            : process.env.CONTENTFUL_ACCESS_TOKEN
        }`,
      },
      body: JSON.stringify({ query }),
    }
  );
  const data = await response.json();
	console.log("Fetched data from ", url, data)
	console.dir(data, { depth: Infinity });
  return data;
}

function extractPost(fetchResponse) {
  return fetchResponse?.data?.postCollection?.items?.[0]
}

function extractPostEntries(fetchResponse, use_val=false) {
  if (use_val)
    return fetchResponse?.data?.allContentfulPost?.nodes
  else
    return fetchResponse?.data?.postCollection?.items
}

export async function getPreviewPostBySlug(slug) {
  const entry = await fetchGraphQL(
    `query {
      postCollection(where: { slug: "${slug}" }, preview: true, limit: 1) {
        items {
          ${POST_GRAPHQL_FIELDS}
        }
      }
    }`,
    true
  )
  return extractPost(entry)
}

export async function getAllPostsWithSlug() {
  const entries = await fetchGraphQL(
    `query {
      postCollection(where: { slug_exists: true }, order: date_DESC) {
        items {
          ${POST_GRAPHQL_FIELDS}
        }
      }
    }`
  )
  return extractPostEntries(entries)
}

export async function getAllPostsForHome(preview) {
  // Toggle use_val to use or to not use valhalla for loading the landing page.
  // Note, everything else still loads by directly going to contentful API
  const use_val = process.env.USE_VALHALLA === 'true';
  let query
	// Using GATSBY_CONTENT_FIELD to fetch from Gatsby
  if (use_val)
    query = 'query { allContentfulPost { nodes { '+POST_GRAPHQL_FIELDS_COMMON+GATSBY_CONTENT_FIELD+' } } }'
  else
    query = `query {
      postCollection(order: date_DESC, preview: ${preview ? 'true' : 'false'}) {
          items {
            ${POST_GRAPHQL_FIELDS} ${CONTENTFUL_CONTENT_FIELD}
          }
        }
      }`
  const entries = await fetchGraphQL(query, use_val)
  return extractPostEntries(entries, use_val)
}

export async function getPostAndMorePosts(slug, preview) {
  const entry = await fetchGraphQL(
    `query {
      postCollection(where: { slug: "${slug}" }, preview: ${
      preview ? 'true' : 'false'
    }, limit: 1) {
        items {
          ${POST_GRAPHQL_FIELDS}
        }
      }
    }`,
    preview
  )
  const entries = await fetchGraphQL(
    `query {
      postCollection(where: { slug_not_in: "${slug}" }, order: date_DESC, preview: ${
      preview ? 'true' : 'false'
    }, limit: 2) {
        items {
          ${POST_GRAPHQL_FIELDS}
        }
      }
    }`,
    preview
  )
  return {
    post: extractPost(entry),
    morePosts: extractPostEntries(entries),
  }
}
