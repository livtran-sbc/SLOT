#!/usr/bin/perl -w

# Author: Kazutoyo Osoegawa, Ph.D.
# Developed at Stanford Blood Center
# email: kazutoyo@stanford.edu
# phone: 650-724-0169

# module: compareBarcode.pl
# This module was developed to compare barcodes
# 2 input files are required:
# micronic_output.txt
# barcode.csv
# last modified and documented on August 25, 2026 by Livia Tran

use strict;
use FindBin qw($Bin);
use lib $Bin;
use Openfile;

my $date = `date +%F`;          # invoke bash date command
chomp $date;    # remove newline character

my @micro = Openfile::open_file_from_list($ARGV[0]);	# read file
my @barcode = Openfile::open_file_from_list($ARGV[1]);	# read file

my $outfile = $ARGV[2];

my %micro;
my @wells;
foreach my $line ( @micro ){
	unless ( defined $line ) {
		next;
	}
	$line =~ s/\r//g;	# remove ^M
	if ( $line =~ /(\S+),(\d+)/ ) {
		my $well = $1;
		my $barcode = $2;
		$micro{ $well } = $barcode;
		push @wells, $well;
	}
}

my %barcodes;
foreach my $line ( @barcode ) {
	unless ( defined $line ) {
		next;
	}
	$line =~ s/\r//g;	# remove ^M
	my @elements = split /,/, $line;
#	my $well = $elements[2];
	my $well = $elements[3];
#	my $barcode = $elements[3];
	my $barcode = $elements[4];
	if ( $well =~ /([A-H])(\d+)/ ) {
		my $row = $1;
		my $column = $2;
		if ( $column < 10 ) {
			$well = $row . "0" . $column;		# add 0, A01
		}
	}
	$barcodes{ $well } = $barcode;
}

open (FILE, ">$outfile/BarcodeResults_" . $date . ".csv");
print FILE "Well,BarcodeTube,Results\n";
foreach my $well ( @wells ) {
	unless (( exists $micro{ $well } ) && ( exists $barcodes{ $well } )) {
		next;
	}

	if ( $micro{ $well } == $barcodes{ $well } ) {
		print FILE $well . "," . $micro{ $well } . ",OK\n";
	}
	elsif ( $well eq "A01" ) {
		print FILE $well . "," . $micro{ $well } . ",NegativeControl\n";
	}
	elsif ( $well eq "B01" ) {
		print FILE $well . "," . $micro{ $well } . ",PositiveControl\n";
	}
	else {
		my $wrong = $well;
		my $index = 0;
		foreach my $inner_well ( @wells) {
			unless (( exists $micro{ $well } ) && ( exists $barcodes{ $inner_well } )) {
				next;
			}
			if ( $micro{ $well } == $barcodes{ $inner_well } ) {
				$wrong = $inner_well;
				$index++;
			}
		}
		if ( $index > 0 ) {
			print FILE $well . "," . $micro{ $well } . "," . $wrong . "\n";
		}
		else {
			print FILE $well . "," . $micro{ $well } . ",NOT FOUND!!!\n";
		}
	}
}

close FILE;

