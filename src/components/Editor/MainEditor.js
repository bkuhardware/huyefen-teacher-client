import React, { useState, useRef } from 'react';
import _ from 'lodash';
import classNames from 'classnames';
import { connect } from 'dva';
import { Button, Tooltip, Popover, Form, Icon, Input, Tabs, Upload, message } from 'antd';
import { Modifier, EditorState, RichUtils, KeyBindingUtil, getDefaultKeyBinding } from 'draft-js';
import { customStyleMap, customColorMap } from '@/config/constants';
import { convertToRaw } from 'draft-js';
import Editor, { composeDecorators } from 'draft-js-plugins-editor';
import createFocusPlugin from 'draft-js-focus-plugin';
import createResizeablePlugin from 'draft-js-resizeable-plugin';
import createAlignmentPlugin from 'draft-js-alignment-plugin';
import createBlockDndPlugin from 'draft-js-drag-n-drop-plugin';
import createImagePlugin from 'draft-js-image-plugin';
// import createVideoPlugin from 'draft-js-video-plugin';
import { checkValidLinkWithoutProtocol, checkValidLink } from '@/utils/utils';
import alignmentToolStyles from './alignmentToolStyles.css';
import buttonStyles from './buttonStyles.css';
import styles from './MainEditor.less';

// const videoPlugin = createVideoPlugin();
// const { addVideo } = videoPlugin;
// const { types } = videoPlugin;

const focusPlugin = createFocusPlugin();
const resizeablePlugin = createResizeablePlugin();
const blockDndPlugin = createBlockDndPlugin();
const alignmentPlugin = createAlignmentPlugin({
    theme: {
        alignmentToolStyles,
        buttonStyles
    }
});
const { AlignmentTool } = alignmentPlugin;

const decorator = composeDecorators(
    focusPlugin.decorator,
    resizeablePlugin.decorator,
    blockDndPlugin.decorator,
    alignmentPlugin.decorator
);
const imagePlugin = createImagePlugin({ decorator });
const { addImage } = imagePlugin;
const plugins = [
    focusPlugin,
    resizeablePlugin,
    blockDndPlugin,
    alignmentPlugin,
    imagePlugin,
    //videoPlugin
];

const { hasCommandModifier } = KeyBindingUtil;
const { Search } = Input;
const { TabPane } = Tabs;

const findLinkEntity = (contentBlock, callback, contentState) => {
	contentBlock.findEntityRanges((character) => {
		const entityKey = character.getEntity();
		if (entityKey === null) {
			return false;
		}
		return contentState.getEntity(entityKey).getType() === 'LINK';
	}, callback);
};

const Anchor = ({ contentState, entityKey, children }) => {
    const { href } = contentState.getEntity(entityKey).getData();
    const link = `https://${href}`;
	return (
		<Tooltip placement="bottom" title={`Shift+Click to ${link}`} >
            <span 
                className={styles.link}
                onClick={e => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                        window.open(link, '_blank');
                    }
                }}
            >
                {children}
            </span>
        </Tooltip>
	);
};

const MainEditor = ({ dispatch, editorState, onChange, placeholder }) => {
    const editorRef = useRef(null);
    //const [colorVisible, setColorVisible] = useState(false);
    const [imageVisible, setImageVisible] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imageList, setImageList] = useState([]);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageLink, setImageLink] = useState('');
    const [link, setLink] = useState('');
    const [linkVisible, setLinkVisible] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [videoVisible, setVideoVisible] = useState(false); 
    const decorators = [
        {
            strategy: findLinkEntity,
            component: Anchor
        }
    ];
    const blockStyleFn = contentBlock => {
        const blockType = contentBlock.getType();
        if (blockType === 'code-block') return styles.codeBlock;
        // const entityKey = contentBlock.getEntityAt(0);
        // if (entityKey) {
        //     const contentState = editorState.getCurrentContent();
        //     const entity = contentState.getEntity(entityKey);
        //     const entityType = entity.getType();
        //     if (entityType === types.VIDEOTYPE) return styles.video;
        // }
    };
    const onKeyPressed = e => {
        if (e.key === 'Tab') {
            e.preventDefault();
			const newContentState = Modifier.replaceText(
                editorState.getCurrentContent(),
                editorState.getSelection(),
                '\t'
            );
            onChange(EditorState.push(editorState, newContentState, 'tab-character'));
		}
    };
    const handleKeyCommand = command => {
        if (command === 'highlight') {
            return onChange(RichUtils.toggleInlineStyle(editorState, 'HIGHLIGHT'));
        }
        const newState = RichUtils.handleKeyCommand(editorState, command);
        if (newState) {
            onChange(newState);
            return 'handled';
        }
        return 'not-handled';
    };
    const keyBindingFn = e => {
        if (e.keyCode === 72 && hasCommandModifier(e)) {
            return 'highlight';
        }
        return getDefaultKeyBinding(e);
    };
    const handleFocus = () => editorRef.current.focus();
    const handleInlineStyle = inlineStyle => e => {
        e.preventDefault();
        onChange(RichUtils.toggleInlineStyle(editorState, inlineStyle));
    };
    const handleBlock = blockType => e => {
        e.preventDefault();
        onChange(RichUtils.toggleBlockType(editorState, blockType));
    };
    const handleAddLink = () => {
        const selection = editorState.getSelection();
		const contentState = editorState.getCurrentContent();
		let newContentState = contentState.createEntity('LINK', 'MUTABLE', { href: link });
		const entityKey = newContentState.getLastCreatedEntityKey();
		newContentState = Modifier.applyEntity(
			newContentState,
			selection,
			entityKey
		);
		const newEditorState = EditorState.push(
			editorState,
			newContentState,
			'add-new-link'
		);
		onChange(newEditorState);
		setLinkVisible(false);
		setLink('');
    };
    const getBlockType = () => {
        const selectionState = editorState.getSelection();
		return editorState.getCurrentContent().getBlockForKey(selectionState.getStartKey()).getType();
    };
    const inlineStyleBtnClass = inlineStyle => {
        const currentInlineStyle = editorState.getCurrentInlineStyle();
        if (currentInlineStyle.has(inlineStyle)) return classNames(styles.btn, styles.btnActive);
        return styles.btn;
    };
    const entityClass = entityType => {
        const selectionState = editorState.getSelection();
        const contentState = editorState.getCurrentContent();
        const blockKey = selectionState.getStartKey();
        const offset = selectionState.getStartOffset();
        const block = contentState.getBlockForKey(blockKey);
        const entityKey = block.getEntityAt(offset);
        if (entityKey) {
            const entity = contentState.getEntity(entityKey);
            return entity.getType() === entityType ? classNames(styles.btnActive, styles.btn) : styles.btn;
        }
        return styles.btn;
    };
    const blockBtnClass = blockType => {
        if (getBlockType() === blockType) return classNames(styles.btn, styles.btnActive);
        return styles.btn;
    };
    // const handleVideoVisibleChange = visible => {
    //     if (!visible) {
    //         setVideoUrl('');
    //     }
    //     setVideoVisible(visible);
    // };
    // const handleEmbedVideo = () => {
    //     const newEditorState = addVideo(editorState, { src: videoUrl });
    //     console.log(convertToRaw(newEditorState.getCurrentContent()));
    //     onChange(newEditorState);
    //     handleVideoVisibleChange(false);
    // };
    const handleImageVisibleChange = visible => {
        if (!visible) {
            setImageFile(null);
            setImageLink('');
        }
        setImageVisible(visible);
    };
    const handleAddImage = () => {
        onChange(addImage(editorState, imageLink));
        handleImageVisibleChange(false);
    };
    const handleBeforeUpload = (file, fileList) => {
        setImageFile(file);
        setImageList(fileList);
        return false;
    };
    const handleRemove = () => {
        setImageFile(null);
        setImageList([]);
    };
    const handleUploadImage = () => {
        setImageLoading(true);
        const fileReader = new FileReader();
        fileReader.readAsDataURL(imageFile);
        fileReader.onload = () => {
            dispatch({
                type: 'common/upload',
                payload: {
                    file: fileReader.result,
                    callback: link => {
                        onChange(addImage(editorState, link));
                        handleImageVisibleChange(false);
                        setImageLoading(false);
                    }
                }
            });
        };
        setImageList([]);
    };
    const imageUploadProps = {
        accept: 'images/*',
        name: 'avatarfile',
        beforeUpload: handleBeforeUpload,
        onRemove: handleRemove,
        fileList: imageList,
        openFileDialogOnClick: !imageFile,
        showUploadList: {
            showRemoveIcon: true
        }
    };
    return (
        <div className={styles.mainEditor}>
            <div className={styles.editor} onKeyDown={onKeyPressed} onClick={handleFocus}>
                <Editor
                    blockStyleFn={blockStyleFn}
                    customStyleMap={customStyleMap}
                    editorState={editorState}
                    onChange={onChange}
                    placeholder={placeholder}
                    handleKeyCommand={handleKeyCommand}
                    keyBindingFn={keyBindingFn}
                    decorators={decorators}
                    plugins={plugins}
                    ref={editorRef}
                />
                <AlignmentTool />
                <div style={{ clear: 'both' }}></div>
            </div>
            <div className={styles.btnBar}>
                <div className={styles.buttons}>
                    <Tooltip placement="top" title="Bold | Cmd+B">
                        <span className={inlineStyleBtnClass('BOLD')} onMouseDown={handleInlineStyle('BOLD')}><Icon type="bold" /></span>
                    </Tooltip>
                    <Tooltip placement="top" title="Italic | Cmd+I">
                        <span className={inlineStyleBtnClass('ITALIC')} onMouseDown={handleInlineStyle('ITALIC')}><Icon type="italic" /></span>
                    </Tooltip>
                    <Tooltip placement="top" title="Underline | Cmd+U">
                        <span className={inlineStyleBtnClass('UNDERLINE')} onMouseDown={handleInlineStyle('UNDERLINE')}><Icon type="underline" /></span>
                    </Tooltip>
                    <Tooltip placement="top" title="Highlight | Cmd+H">
                        <span className={inlineStyleBtnClass('HIGHLIGHT')} onMouseDown={handleInlineStyle('HIGHLIGHT')}><Icon type="highlight" /></span>
                    </Tooltip>
                    <Popover
                        placement="top"
                        popupClassName={styles.linkPopover}
                        trigger="hover"
                        visible={linkVisible}
                        onVisibleChange={setLinkVisible}
                        content={(
                            <div className={styles.content}>
                                <Search
                                    addonBefore={<span>https://</span>}
                                    enterButton={
                                        <Button
                                            type="primary"
                                            disabled={!checkValidLinkWithoutProtocol(link)}
                                            style={{ width: 60 }}
                                        >
                                            Add
                                        </Button>
                                    }
                                    value={link}
                                    placeholder="Enter href..."
                                    onChange={e => setLink(e.target.value)}
                                    onSearch={handleAddLink}
                                />
                            </div>
                        )}
                    >
                        <span className={entityClass('LINK')} ><Icon type="link" /></span>
                    </Popover>
                    <Tooltip placement="top" title="Header 2">
                        <span className={blockBtnClass('header-two')} onMouseDown={handleBlock('header-two')}>H2</span>
                    </Tooltip>
                    <Tooltip placement="top" title="Header 5">
                        <span className={blockBtnClass('header-five')} onMouseDown={handleBlock('header-five')}>H5</span>
                    </Tooltip>
                    <Tooltip placement="top" title="Numbers list">
                        <span className={blockBtnClass('ordered-list-item')} onMouseDown={handleBlock('ordered-list-item')}>
                            <Icon type="ordered-list" />
                        </span>
                    </Tooltip>
                    <Tooltip placement="top" title="Bullets list">
                        <span className={blockBtnClass('unordered-list-item')} onMouseDown={handleBlock('unordered-list-item')}>
                            <Icon type="unordered-list" />
                        </span>
                    </Tooltip>
                    <Popover
                        placement="top"
                        popupClassName={styles.imagePopover}
                        trigger="click"
                        visible={imageVisible}
                        onVisibleChange={handleImageVisibleChange}
                        content={(
                            <div className={styles.content}>
                                <Tabs
                                    defaultActiveKey="image-upload"
                                >
                                    <TabPane
                                        key="image-upload"
                                        tab="Image upload"
                                    >
                                        <div className={styles.tabPane}>
                                            <div className={styles.inlineDiv}>
                                                <Upload {...imageUploadProps}>
                                                    {!imageFile ? (
                                                        <Button className={styles.upBtn} >
                                                            <Icon type="upload" /> Add image
                                                        </Button>
                                                    ) : (
                                                        <Button type="primary" onClick={handleUploadImage}>
                                                            <Icon type={imageLoading ? "loading" : "check"} /> Let's upload                    
                                                        </Button>
                                                    )}
                                                </Upload>
                                            </div>
                                        </div>
                                    </TabPane>
                                    <TabPane
                                        key="image-link"
                                        tab="URL"
                                    >
                                        <div className={styles.tabPane}>
                                            <div className={styles.inlineDiv}>
                                                <div className={styles.input}>
                                                    <Input placeholder="Enter url..." value={imageLink} onChange={e => setImageLink(e.target.value)} />
                                                </div>
                                                <div className={styles.btn}>
                                                    <Button type="primary" onClick={handleAddImage} size="small" disabled={!checkValidLink(imageLink)}>Add</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </TabPane>
                                </Tabs>
                            </div>
                        )}
                    >
                        <span className={styles.btn} ><Icon type="picture" /></span>
                    </Popover>
                    {/* <Popover
                        placement="top"
                        trigger="click"
                        popupClassName={styles.videoPopover}
                        visible={videoVisible}
                        onVisibleChange={handleVideoVisibleChange}
                        content={(
                            <div className={styles.content}>
                                <Search
                                    enterButton={
                                        <Button
                                            type="primary"
                                            disabled={!checkValidLink(videoUrl)}
                                            style={{ width: 90 }}
                                        >
                                            Embed
                                        </Button>
                                    }
                                    value={videoUrl}
                                    placeholder="Video URL"
                                    onChange={e => setVideoUrl(e.target.value)}
                                    onSearch={handleEmbedVideo}
                                />
                            </div>
                        )}
                    >
                        <span className={styles.btn} ><Icon type="youtube" /></span>
                    </Popover> */}
                    <Tooltip placement="top" title="Code block">
                        <span className={blockBtnClass('code-block')} onMouseDown={handleBlock('code-block')}><Icon type="code" /></span>
                    </Tooltip>
                </div>
            </div>
        </div>
    )
};

export default connect()(MainEditor);