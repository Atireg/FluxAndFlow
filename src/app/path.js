/**
 * The path's milestones, oldest first - one to a dot (components/PathView.jsx).
 * Taken from the user's CV and their own changes, in their words: `when` the
 * years, `what` the role or degree, `where` the place - beside or under the
 * dot - and, on the card that drops from it on a hover or tap, `details`
 * and a picture (`image`, its file's `ratio`), either left out if there's
 * none; `title`, if given, heads the card in place of `what` - a longer
 * name than fits by the dot. Write "knippershelbig" so, one lowercase word.
 */
export const MILESTONES = [
    {
        when: '2009 – 2013',
        what: 'Bachelor in Architecture and Urban Planning',
        where: 'University of Stuttgart',
        details: 'Bachelor Thesis: Development of Connections and Structural Reinforcement for Fiber '
            + 'Composites Using Computational Design Methods. Developed a tool to simulate the '
            + 'structural behavior of glass-and-carbon fibre composites and optimise the material '
            + 'distribution for the ICD/ITKE 2013/14 Research Pavilion.',
        image: { src: 'images/path-01.jpg', ratio: '372 / 214', alt: 'The ICD/ITKE Research Pavilion 2013/14' },
    },
    {
        when: '2011 – 2013',
        what: 'Student employee',
        where: 'Knippers Helbig Advanced Engineering, Stuttgart',
        details: 'Participated in the planning and execution phases for projects at different scales: '
            + 'art installations, a museum, an airport, high-rise buildings, and pedestrian and road '
            + 'bridges in Germany, Finland, Italy, Dubai, Abu Dhabi, USA and China.',
        image: { src: 'images/path-02.jpg', ratio: '373 / 288', alt: 'Two high-rise towers, a project at Knippers Helbig' },
    },
    {
        when: '2013 – 2014',
        what: 'Junior architect',
        where: 'Architectural Office Prof. W. Kergaßner, Stuttgart',
        details: 'Contributed to the execution phase of the ZF Forum, a new corporate headquarters, and '
            + 'led the design competition for a 250 m tall speed-testing tower for ThyssenKrupp, '
            + 'which won second place.',
        image: { src: 'images/path-03.jpg', ratio: '372 / 242', alt: 'The ZF Forum from the air' },
    },
    {
        when: '2014 – 2015',
        what: 'Master in Integrative Technologies and Architectural Design Research (ITECH)',
        where: 'University of Stuttgart',
        details: 'Master Thesis: Emergent Space: Simulations and Analyses of Spatial Aggregate '
            + 'Formations. Investigated the structural behavior and architectural potential of the '
            + 'non-standard building material system called "Aggregates" through physical '
            + 'prototyping and material simulations.',
        image: { src: 'images/path-04.jpg', ratio: '372 / 279', alt: 'An aggregate of white star-shaped grains around a red ball' },
    },
    {
        when: '2016 – 2019',
        what: 'PhD researcher',
        where: 'Gramazio Kohler Research, ETH Zurich',
        details: 'PhD project: Jammed Architectural Structures. Developed computational design and '
            + 'robotic fabrication tools for aggregating textile string and crushed stones into '
            + 'load-bearing architectural structures that are re-usable and generate minimal '
            + 'material waste.',
        image: { src: 'images/path-05.jpg', ratio: '373 / 212', alt: 'A robot beside a jammed column of stone and string' },
    },
    {
        when: '2017',
        what: 'Tutor, Master of Advanced Studies in Architecture and Digital Fabrication',
        where: 'ETH Zurich',
        details: 'My first teaching experience was as a tutor in the MAS DFAB program at ETH Zurich, '
            + 'a one-year full time educational program.',
        image: { src: 'images/path-06.jpg', ratio: '345 / 220', alt: 'Spatial Aggregations, a MAS DFAB project' },
    },
    {
        when: '2019 – 2023',
        what: 'Lecturer in Architecture',
        where: 'Swinburne University of Technology, Melbourne',
        details: 'A workload split between 50 % teaching, 30 % research and 20 % leadership/service, '
            + 'shaping the newly established bachelor\'s and master\'s programs, and co-supervising '
            + 'two PhD students.',
        image: { src: 'images/path-08.jpg', ratio: '370 / 181', alt: 'A student working with two robot arms' },
    },
    {
        when: '2020 – 2021',
        what: 'Director of exhibition',
        title: 'Director of end-of-year graduation exhibition (GradX) for Architecture and Industrial Design',
        where: 'Swinburne University of Technology, Melbourne',
        details: 'For two consecutive years, I had a leading role in directing the end-of-year '
            + 'exhibition GradX for the School of Design and Architecture. Due to COVID-19 '
            + 'restrictions, my team and I reinvented it: more than twenty 3D virtual spaces '
            + 'showcasing the work of nearly 400 graduating students from 18 disciplines, visited by '
            + '2.2 K people from all over the world. For my efforts, I won the Dean’s Award for '
            + 'Innovation.',
        image: { src: 'images/path-10.jpg', ratio: '375 / 314', alt: 'One of the GradX virtual spaces: a city block on a crumbling cube of earth' },
    },
    {
        when: '2021 – 2023',
        what: 'Deputy Department Chair for Architecture and Industrial Design',
        where: 'Swinburne University of Technology, Melbourne',
        details: 'Supporting the Department Chair in overseeing six disciplines and over 30 academic '
            + 'staff in the School of Design and Architecture.',
    },
    {
        when: 'current',
        what: 'Associate, Head of Digital Technologies',
        where: 'knippershelbig, Stuttgart',
        details: 'Developing innovative engineering solutions with code: automating fabrication '
            + 'processes, simulating thermal performance and exploring new material applications in '
            + 'construction, drawing on over a decade of coding experience across multiple domains.',
        image: {
            src: 'images/frameless-glass-01.jpg',
            ratio: '1500 / 633',
            alt: 'The glass pavilion at the fair: a pointed arch of glass sheets in front of white curtains',
        },
    },
];
