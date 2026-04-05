import { Packer, Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ImageRun } from 'docx';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    // 读取图片
    const imagePath = path.join(__dirname, '../draft_8_1.png');
    const imageBuffer = fs.readFileSync(imagePath);

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                // 标题
                new Paragraph({
                    text: '基于深度学习的图像识别研究',
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                }),

                // 摘要
                new Paragraph({
                    children: [
                        new TextRun({ text: '摘要：', bold: true }),
                        new TextRun({ text: '随着人工智能技术的快速发展，深度学习在图像识别领域取得了突破性进展。本文提出了一种基于卷积神经网络的图像识别方法。' }),
                    ],
                }),
                new Paragraph({
                    text: '关键词：深度学习；图像识别；卷积神经网络',
                }),

                // 一、引言
                new Paragraph({
                    text: '一、引言',
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: '图像识别是计算机视觉领域的核心问题之一。传统的图像识别方法主要依赖于手工设计的特征提取器。',
                    indent: { firstLine: 480 },
                }),

                // 二、相关理论
                new Paragraph({
                    text: '二、相关理论',
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: '2.1 深度学习基础',
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: '深度学习是机器学习的一个分支，它通过构建多层神经网络来学习数据的层次化表示。',
                    indent: { firstLine: 480 },
                }),

                // 图片
                new Paragraph({
                    text: '图1 系统架构图',
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 100 },
                }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: 400,
                                height: 300,
                            },
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),

                // 表格
                new Paragraph({
                    text: '表1 不同方法的性能对比',
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 300, after: 100 },
                }),
                new Table({
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ text: '方法', alignment: AlignmentType.CENTER })],
                                    width: { size: 25, type: WidthType.PERCENTAGE },
                                }),
                                new TableCell({
                                    children: [new Paragraph({ text: '准确率', alignment: AlignmentType.CENTER })],
                                    width: { size: 25, type: WidthType.PERCENTAGE },
                                }),
                                new TableCell({
                                    children: [new Paragraph({ text: '召回率', alignment: AlignmentType.CENTER })],
                                    width: { size: 25, type: WidthType.PERCENTAGE },
                                }),
                                new TableCell({
                                    children: [new Paragraph({ text: 'F1分数', alignment: AlignmentType.CENTER })],
                                    width: { size: 25, type: WidthType.PERCENTAGE },
                                }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: 'SVM' })] }),
                                new TableCell({ children: [new Paragraph({ text: '85.2%' })] }),
                                new TableCell({ children: [new Paragraph({ text: '83.1%' })] }),
                                new TableCell({ children: [new Paragraph({ text: '84.1%' })] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: 'Random Forest' })] }),
                                new TableCell({ children: [new Paragraph({ text: '87.5%' })] }),
                                new TableCell({ children: [new Paragraph({ text: '86.3%' })] }),
                                new TableCell({ children: [new Paragraph({ text: '86.9%' })] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: 'CNN (本文)' })] }),
                                new TableCell({ children: [new Paragraph({ text: '92.5%' })] }),
                                new TableCell({ children: [new Paragraph({ text: '91.8%' })] }),
                                new TableCell({ children: [new Paragraph({ text: '92.1%' })] }),
                            ],
                        }),
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                }),

                // 三、实验与结果
                new Paragraph({
                    text: '三、实验与结果',
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 300 },
                }),
                new Paragraph({
                    text: '本文在CIFAR-10数据集上进行了实验。实验结果表明，本文提出的方法在测试集上达到了92.5%的准确率。',
                    indent: { firstLine: 480 },
                }),

                // 四、结论
                new Paragraph({
                    text: '四、结论',
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: '本文提出了一种基于深度学习的图像识别方法，通过卷积神经网络实现了对复杂图像的高精度识别。',
                    indent: { firstLine: 480 },
                }),

                // 参考文献
                new Paragraph({
                    text: '参考文献',
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400 },
                }),
                new Paragraph({
                    text: '[1] LeCun Y, Bengio Y, Hinton G. Deep learning[J]. Nature, 2015, 521(7553): 436-444.',
                }),
                new Paragraph({
                    text: '[2] Krizhevsky A, Sutskever I, Hinton G E. ImageNet classification with deep convolutional neural networks[J]. Advances in neural information processing systems, 2012, 25: 1097-1105.',
                }),
                new Paragraph({
                    text: '[3] Simonyan K, Zisserman A. Very deep convolutional networks for large-scale image recognition[J]. arXiv preprint arXiv:1409.1556, 2014.',
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync('test-export-full.docx', buffer);
    console.log('文档已导出: test-export-full.docx');
    console.log('文件大小:', buffer.length, 'bytes');
    console.log('包含: 标题、段落、图片、表格、参考文献');
}

main().catch(console.error);
