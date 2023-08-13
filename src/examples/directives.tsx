import React from 'react'
import {
  AdmonitionDirectiveDescriptor,
  DialogButton,
  DirectiveDescriptor,
  GenericDirectiveEditor,
  MDXEditor,
  NestedLexicalEditor,
  codeBlockPlugin,
  codeMirrorPlugin,
  directivesPlugin,
  directivesPluginHooks,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  toolbarPlugin,
  realmPlugin,
  system,
  coreSystem,
  CreateImageNodeOptions,
  $createImageNode,
  imagePlugin,
  MdastImportVisitor,
  ImageNode,
  LexicalExportVisitor,
  $isImageNode
} from '../'

import * as Mdast from 'mdast'

import admonitionMarkdown from './assets/admonition.md?raw'
import {
  TextDirective,
  ContainerDirective,
  Directive,
  LeafDirective,
  directiveFromMarkdown,
  directiveToMarkdown
} from 'mdast-util-directive'
import { directive } from 'micromark-extension-directive'
import { $createParagraphNode, $createTextNode, ElementNode, RootNode } from 'lexical'

const youtubeMarkdown = `
This should be an youtube video:

::youtube{#A5lXAKrttBU}
`

const GenericDirectiveDescriptor: DirectiveDescriptor = {
  name: 'directive',
  testNode() {
    return true
  },
  attributes: ['id'],
  hasChildren: true,
  Editor: GenericDirectiveEditor
}

const YouTubeButton = () => {
  const insertDirective = directivesPluginHooks.usePublisher('insertDirective')

  return (
    <DialogButton
      tooltipTitle="Insert Youtube video"
      submitButtonTitle="Insert video"
      dialogInputPlaceholder="Paste the youtube video URL"
      buttonContent="YT"
      onSubmit={(url) => {
        const videoId = new URL(url).searchParams.get('v')
        if (videoId) {
          insertDirective({
            name: 'youtube',
            type: 'leafDirective',

            attributes: { id: videoId },
            children: []
          } as LeafDirective)
        } else {
          alert('Invalid YouTube URL')
        }
      }}
    />
  )
}

export const Youtube: React.FC = () => {
  return (
    <MDXEditor
      markdown={youtubeMarkdown}
      plugins={[
        directivesPlugin({ directiveDescriptors: [] }),
        toolbarPlugin({
          toolbarContents: () => {
            return <YouTubeButton />
          }
        })
      ]}
    />
  )
}

const genericMarkdown = `
a text directive :d{#id} with some text.

::leaf[some content]{#meh}

text

:::block{#id}

Some **markdown**

:::
`

export const CatchAll: React.FC = () => {
  return <MDXEditor markdown={genericMarkdown} plugins={[directivesPlugin({ directiveDescriptors: [GenericDirectiveDescriptor] })]} />
}

export const Admonitions: React.FC = () => {
  return (
    <MDXEditor
      onChange={console.log}
      markdown={admonitionMarkdown}
      plugins={[
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        linkPlugin(),
        listsPlugin(),
        headingsPlugin(),
        codeBlockPlugin(),
        quotePlugin(),
        markdownShortcutPlugin()
      ]}
    />
  )
}

const codeBlockInAdmonition = `
text

:::note
test

\`\`\`jsx
console.log("foo")
\`\`\`
:::

foo

\`\`\`jsx
console.log("foo")
\`\`\`

more markdown
`

export const AdmonitionsWithCodeBlocks: React.FC = () => {
  return (
    <MDXEditor
      onChange={console.log}
      markdown={codeBlockInAdmonition}
      plugins={[
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        linkPlugin(),
        codeBlockPlugin(),
        codeMirrorPlugin({ codeBlockLanguages: { jsx: 'JavaScript' } })
      ]}
    />
  )
}

const CalloutCustomDirectiveDescriptor: DirectiveDescriptor = {
  name: 'callout',
  testNode(node) {
    return node.name === 'callout'
  },
  attributes: [],
  hasChildren: true,
  Editor: (props) => {
    return (
      <div style={{ border: '1px solid red', padding: 8, margin: 8 }}>
        <NestedLexicalEditor<ContainerDirective>
          block
          getContent={(node) => node.children}
          getUpdatedMdastNode={(mdastNode, children: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            return { ...mdastNode, children }
          }}
        />
      </div>
    )
  }
}

const CalloutDirectiveDescriptor: DirectiveDescriptor = {
  name: 'callout',
  testNode(node) {
    return node.name === 'callout'
  },
  attributes: [],
  hasChildren: true,
  Editor: GenericDirectiveEditor
}

export const CalloutEditor: React.FC = () => {
  return (
    <MDXEditor
      onChange={console.log}
      markdown={`
:::callout
you better watch out!
::: 

Copyright (c) 2023 Author. All Rights Reserved.
      `}
      plugins={[directivesPlugin({ directiveDescriptors: [CalloutDirectiveDescriptor] })]}
    />
  )
}

const MdastImageDirectiveVisitor: MdastImportVisitor<TextDirective> = {
  testNode: (mdastNode) => {
    return mdastNode.type === 'textDirective' && mdastNode.name === 'img'
  },

  visitNode({ mdastNode, lexicalParent }) {
    const payload: CreateImageNodeOptions = {
      src: mdastNode.attributes?.src ?? '',
      altText: (mdastNode.children[0] as Mdast.Text).value
    }
    ;(lexicalParent as ElementNode).append($createImageNode(payload))
  }
}

const LexicalImageNodeVisitor: LexicalExportVisitor<ImageNode, Directive> = {
  testLexicalNode: $isImageNode,
  visitLexicalNode({ lexicalNode, mdastParent, actions }) {
    const mdastNode: TextDirective = {
      type: 'textDirective',
      name: 'img',
      attributes: {
        src: lexicalNode.getSrc()
      },
      children: [{ type: 'text', value: lexicalNode.getAltText() }]
    }
    actions.appendToParent(mdastParent, mdastNode)
  }
}

const [imageAsDirectivePlugin] = realmPlugin({
  id: 'imageAsDirective',
  systemSpec: system(() => ({}), [coreSystem]),
  init: (realm) => {
    realm.pubKey('addMdastExtension', directiveFromMarkdown)
    realm.pubKey('addSyntaxExtension', directive())
    realm.pubKey('addImportVisitor', MdastImageDirectiveVisitor)
    realm.pubKey('addExportVisitor', LexicalImageNodeVisitor)
    realm.pubKey('addToMarkdownExtension', directiveToMarkdown)
  }
})

const imageDirectiveMarkdown = `
Content

inline images =  :img[alt text]{src="https://via.placeholder.com/150"} :img[alt text]{src="https://via.placeholder.com/150"} :img[alt text]{src="https://via.placeholder.com/150"}

:img[alt text]{src="https://via.placeholder.com/150"}

more
`

export const ImageAsDirective: React.FC = () => {
  return <MDXEditor onChange={console.log} markdown={imageDirectiveMarkdown} plugins={[imageAsDirectivePlugin(), imagePlugin()]} />
}