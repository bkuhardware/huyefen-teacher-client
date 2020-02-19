import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import moment from 'moment';
import classNames from 'classnames';
import Link from 'umi/Link';
import { connect } from 'dva';
import { Row, Col, Select, Button, Icon, Input, Progress as ProgressBar, Table, Spin, Divider, Modal, Form } from 'antd';
import styles from './index.less';

const { Option } = Select;
const { Search } = Input;
const FormItem = Form.Item;

const Privacy = ({ value }) => {
    let text;
    let className = null;
    switch(value) {
        case 'public':
            text = 'Public';
            break;
        case 'private':
            text = 'Private';
            break;
        default:
            className = styles.draft
            text = 'DRAFT (private)';
    };
    return (<span className={className}>{text}</span>);
};

const Progress = ({ value }) => {
    if (value === 100)
        return (
            <span>
                <Icon type="check-circle" theme="filled" style={{ fontSize: '1.2em', color: '#52c41a' }}/>
                <span style={{ marginLeft: '5px' }}>Completed</span>
            </span>
        );;
    return <ProgressBar
        strokeColor={{
            '0%': '#FADA5E',
            '100%': 'yellow'
        }}
        strokeWidth={6}
        percent={value}
    />;
};

const columns = [
    {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: '40%',
        render: name => <span className={styles.name}>{name}</span>
    },
    {
        title: 'Privacy',
        dataIndex: 'privacy',
        key: 'privacy',
        width: '15%',
        render: val => <Privacy value={val} />
    },
    {
        title: 'Progress',
        dataIndex: 'progress',
        key: 'progress',
        align: 'center',
        width: '15%',
        render: val => <Progress value={val} />
    },
    {
        title: 'Last updated',
        dataIndex: 'updatedAt',
        key: 'lastUpdated',
        width: '15%',
        align: 'center',
        render: val => <span className={styles.lastUpdated}>{moment(val).format('MM/YYYY')}</span>
    },
    {
        title: 'Action',
        key: 'action',
        width: '15%',
        align: 'center',
        render: () => (
            <span className={styles.action}>
                <Link to="/">Edit content</Link>
                <Divider type="vertical" className={styles.divider} />
                <Link to="/">Manage</Link>
            </span>
        )
    }
];

const Courses = ({ dispatch, ...props }) => {
    const [searchWidth, setSearchWidth] = useState('200px');
    const [modalVisible, setModalVisible] = useState(false);
    const [courseType, setCourseType] = useState('course');
    const [courseTitle, setCourseTitle] = useState('');
    const [courseArea, setCourseArea] = useState(undefined);
    const {
        courses,
        total,
        currentPage,
        sortBy,
        initLoading,
        areasMenu,
        sortLoading,
        pageChangeLoading,
        settingsLoading
    } = props;
    useEffect(() => {
        dispatch({
            type: 'courses/fetch'
        });
        return () => dispatch({
            type: 'courses/reset'
        });
    }, []);
    const handleSortby = val => {
        dispatch({
            type: 'courses/sort',
            payload: val
        });
    };
    const handleChangePage = page => {
        dispatch({
            type: 'courses/page',
            payload: page
        });
    };
    const handleChangeCourseTitle = e => {
        const val = e.target.value;
        
    };
    const handleChangeCourseArea = area => setCourseArea(area);
    const handleCreateCourse = () => {};
    const handleCancelCreateCourse = () => {};
    const disabled = !courses || initLoading;
    return (
        <div className={styles.courses}>
            <div className={styles.actions}>
                <Button type="primary" icon={disabled ? "loading" : "plus"} disabled={disabled} onClick={() => setModalVisible(true)}>New course</Button>
                <div className={styles.filters}>
                    <Search 
                        className={styles.search}
                        placeholder="Find course"
                        size="large"
                        disabled={disabled}
                        style={{ width: searchWidth }}
                        onSearch={() => {}}
                        onFocus={() => setSearchWidth('280px')}
                        onBlur={() => setSearchWidth('200px')}
                    />
                    <Select
                        className={styles.sortBy}
                        disabled={disabled || sortLoading}
                        loading={disabled || sortLoading}
                        size="large" 
                        value={sortBy}
                        dropdownMatchSelectWidth={false}
                        onChange={handleSortby}
                    >
                        <Option value="newest">Newest</Option>
                        <Option value="oldest">Oldest</Option>
                        <Option value="a-z">Alphabet A - Z</Option>
                        <Option value="z-a">Alphabet Z - A</Option>
                    </Select>
                </div>
            </div>
            <div className={styles.main}>
                {!courses || initLoading ? (
                    <div className={styles.loading}>
                        <Spin indicator={<Icon type="loading" spin style={{ fontSize: 64 }} />}/>
                        <div className={styles.text}>Fetching courses...</div>
                    </div>
                ) : (
                    <React.Fragment>
                        <Table
                            columns={columns}
                            rowKey={course => course._id + _.uniqueId('course_')}
                            dataSource={courses}
                            pagination={total > 8 ? {
                                total: total,
                                pageSize: 8,
                                current: currentPage,
                                onChange: handleChangePage
                            } : false}
                            loading={sortLoading || pageChangeLoading}
                        />
                    </React.Fragment>
                )}
            </div>
            <Modal
                className={styles.newCourseModal}
                title={<div className={styles.title}>Create course</div>}
                width={605}
                okText="Completed"
                maskClosable={false}
                visible={true}
                onOk={handleCreateCourse}
                onCancel={handleCancelCreateCourse}
                bodyStyle={{
                    padding: '30px 35px 50px 35px'
                }}
            >
                <div className={styles.courseType}>
                    <div className={styles.title}>What type of course?</div>
                    <Row className={styles.options} gutter={24}>
                        <Col span={12}>
                            <Row gutter={8} className={courseType === 'course' ? classNames(styles.option, styles.selected) : styles.option} onClick={() => setCourseType('course')}>
                                <Col className={styles.icon} span={6}>
                                    <Icon type="play-square" />
                                </Col>
                                <Col span={18}>
                                    <div className={styles.name}>Course</div>
                                    <div className={styles.description}>
                                        Create rich learning experiences with the help of video lectures, quizzes, coding exercises, etc.
                                    </div>
                                </Col>
                            </Row>
                        </Col>
                        <Col span={12}>
                            <Row gutter={8} className={courseType === 'practice' ? classNames(styles.option, styles.selected) : styles.option} onClick={() => setCourseType('practice')}>
                                <Col className={styles.icon} span={6}>
                                    <Icon type="read" />
                                </Col>
                                <Col span={18}>
                                    <div className={styles.name}>Practice</div>
                                    <div className={styles.description}>
                                        Help students prepare for certification exams by providing practice questions.
                                    </div>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </div>
                <Form>
                    <FormItem label="Title" required>
                        <Input
                            type="text"
                            value={courseTitle}
                            onChange={handleChangeCourseTitle}
                            placeholder="Title"
                            addonAfter={courseTitle.length < 60 ? `${courseTitle.length}/60` : <Icon type="check" />}
                        />
                    </FormItem>
                    <FormItem label="Area" required>
                        <Select
                            value={courseArea}
                            placeholder="Course area"
                            onChange={handleChangeCourseArea}
                            loading={!areasMenu || settingsLoading}
                            disabled={!areasMenu || settingsLoading}
                            dropdownClassName={styles.courseAreaDropdown}
                        >
                            {areasMenu && _.map(areasMenu, area => (
                                <Option key={area._id} value={area._id}>{area.title}</Option>
                            ))}
                        </Select>
                    </FormItem>
                </Form>
            </Modal>
        </div>
    );
};

export default connect(
    ({ settings, courses, loading }) => ({
        courses: courses.list,
        sortBy: courses.sortBy,
        total: courses.total,
        currentPage: courses.currentPage,
        areasMenu: settings.areasMenu,
        initLoading: !!loading.effects['courses/fetch'],
        sortLoading: !!loading.effects['courses/sort'],
        pageChangeLoading: !!loading.effects['courses/page'],
        settingsLoading: !!loading.effects['settings/fetch']
    })
)(Courses);